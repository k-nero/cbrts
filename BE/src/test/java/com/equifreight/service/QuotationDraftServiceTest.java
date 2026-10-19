package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Place;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.ManualLineRequest;
import com.equifreight.model.quotation.OverrideRequest;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.QuoteGroupResponse;
import com.equifreight.model.quotation.QuoteLineResponse;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.PricedLine;
import com.equifreight.service.pricing.PricingHorse;
import com.equifreight.service.pricing.PricingInput;
import com.equifreight.service.pricing.PricingInputs;
import com.equifreight.service.pricing.QuotePricer;
import com.equifreight.service.pricing.RateSet;
import com.equifreight.service.pricing.RateSetLoader;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

/** US-Q-01, US-Q-03, US-Q-09: starting and re-pricing a draft quotation from the rate catalog. */
class QuotationDraftServiceTest {

    static final Instant NOW = Instant.parse("2026-10-19T04:00:00Z");

    TransportRequestRepository requests;
    QuotationRepository quotations;
    RateCatalogVersionRepository versions;
    RateSetLoader loader;
    PricingInputs inputs;
    CodeService codes;
    UserRepository users;
    AuditService audit;
    QuotationDraftService service;

    User yen;
    TransportRequest request;
    Corridor corridor;
    RateCatalogVersion v2;
    RateCatalogVersion v3;
    List<PricingHorse> horses;
    Optional<Quotation> stored = Optional.empty();

    @BeforeEach
    void setUp() {
        requests = mock(TransportRequestRepository.class);
        quotations = mock(QuotationRepository.class);
        versions = mock(RateCatalogVersionRepository.class);
        loader = mock(RateSetLoader.class);
        inputs = mock(PricingInputs.class);
        codes = mock(CodeService.class);
        users = mock(UserRepository.class);
        audit = mock(AuditService.class);
        service = new QuotationDraftService(
                requests,
                quotations,
                versions,
                new QuotationPricing(loader, inputs, versions, users),
                codes,
                audit,
                Clock.fixed(NOW, BusinessTime.ZONE));

        yen = new User();
        yen.setId(UUID.randomUUID());
        corridor = new Corridor();
        corridor.setId(UUID.randomUUID());
        corridor.setCode("AIR PNH → HKG");
        corridor.setMode(TransportMode.AIR);
        request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0199");
        request.setStatus(RequestStatus.SUBMITTED);
        request.setMode(TransportMode.AIR);
        request.setAirClass(ServiceClass.BUSINESS);
        request.setInsurance(InsuranceOption.EQUIFREIGHT);
        request.setCorridor(corridor);
        request.setDepartureDate(LocalDate.of(2026, 11, 20));
        Club club = new Club();
        club.setName("Saigon Turf Club");
        request.setClub(club);
        request.setOriginPlace(place("Phnom Penh"));
        request.setDestinationPlace(place("Hong Kong"));

        v2 = version(2);
        v3 = version(3);
        horses = new ArrayList<>(List.of(
                new PricingHorse(
                        UUID.randomUUID(), "Nightfall", HorseSex.MARE, "M", 32, false, new BigDecimal("175000")),
                new PricingHorse(
                        UUID.randomUUID(), "Shadowfax", HorseSex.GELDING, "M", 32, false, new BigDecimal("150000"))));

        when(requests.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));
        when(requests.findById(request.getId())).thenReturn(Optional.of(request));
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v2));
        when(loader.load(v2.getId())).thenReturn(rows(v2, true));
        when(loader.load(v3.getId())).thenReturn(rows(v3, true));
        when(inputs.inputFor(eq(request), any())).thenAnswer(i -> input(i.getArgument(1)));
        when(codes.next(CodePrefix.Q, 2026)).thenReturn("Q-2026-0189");
        when(quotations.findFirstByRequestIdOrderByVersionNoDesc(request.getId()))
                .thenAnswer(i -> stored);
        when(quotations.saveAndFlush(any())).thenAnswer(i -> {
            Quotation q = i.getArgument(0);
            if (q.getId() == null) {
                q.setId(UUID.randomUUID());
            }
            stored = Optional.of(q);
            return q;
        });
        when(quotations.save(any())).thenAnswer(i -> i.getArgument(0));
        User lan = new User();
        lan.setFirstName("Thị Lan");
        lan.setLastName("Nguyễn");
        when(users.findByRoleAndStatus("TRANSPORT_SPECIALIST", UserStatus.ACTIVE))
                .thenReturn(List.of(lan));
    }

    static Place place(String city) {
        Place p = new Place();
        p.setCity(city);
        return p;
    }

    static RateCatalogVersion version(int no) {
        RateCatalogVersion v = new RateCatalogVersion();
        v.setId(UUID.randomUUID());
        v.setVersionNo(no);
        v.setStatus(CatalogStatus.PUBLISHED);
        return v;
    }

    PricingInput input(ServiceClass airClass) {
        return new PricingInput(
                request.getMode(),
                "AIR PNH → HKG",
                "Phnom Penh",
                "Hong Kong",
                "Hong Kong",
                1550,
                0,
                airClass,
                request.getTrailer(),
                request.getInsurance(),
                false,
                0,
                List.copyOf(horses),
                request.getArrivalMode() == com.equifreight.entity.enums.ArrivalMode.WINDOW);
    }

    /** Business and first stall rows (business optional), a groom line, the four percentages. */
    CatalogRows rows(RateCatalogVersion v, boolean withBusiness) {
        List<RateServiceClass> stalls = new ArrayList<>();
        if (withBusiness) {
            stalls.add(stall(v, ServiceClass.BUSINESS, 48));
        }
        stalls.add(stall(v, ServiceClass.FIRST, 96));
        RateLine groom = new RateLine();
        groom.setId(UUID.randomUUID());
        groom.setVersion(v);
        groom.setCode("GROOM");
        groom.setGroupCode("D");
        groom.setDescription("Flying groom");
        groom.setBasis(RateBasis.PER_THREE_HORSES);
        groom.setRate(new BigDecimal("1450"));
        groom.setCertainty(RateCertainty.FIXED);
        List<RatePolicy> policies = new ArrayList<>();
        for (RatePolicyKey key : List.of(
                RatePolicyKey.FUEL_PCT,
                RatePolicyKey.INSURANCE_PCT,
                RatePolicyKey.CONTINGENCY_PCT,
                RatePolicyKey.SERVICE_FEE_PCT,
                RatePolicyKey.QUOTE_VALIDITY_DAYS)) {
            RatePolicy p = new RatePolicy();
            p.setId(new RatePolicy.Key(v.getId(), key));
            p.setValue(key == RatePolicyKey.QUOTE_VALIDITY_DAYS ? new BigDecimal("7") : BigDecimal.TEN);
            policies.add(p);
        }
        return new CatalogRows(v, stalls, List.of(groom), List.of(), policies, List.of());
    }

    RateServiceClass stall(RateCatalogVersion v, ServiceClass sc, int width) {
        RateServiceClass s = new RateServiceClass();
        s.setId(UUID.randomUUID());
        s.setVersion(v);
        s.setCorridor(corridor);
        s.setServiceClass(sc);
        s.setWidthPerHorseIn((short) width);
        s.setHorsesPerPosition((short) (96 / width));
        s.setPositionRate(new BigDecimal("16800"));
        return s;
    }

    Quotation issued() {
        Quotation q = new Quotation();
        q.setId(UUID.randomUUID());
        q.setCode("Q-2026-0189");
        q.setVersionNo((short) 1);
        q.setStatus(QuotationStatus.ISSUED);
        q.setRequest(request);
        q.setRateCatalogVersion(v2);
        q.setCurrency("USD");
        q.setAirClass(ServiceClass.BUSINESS);
        return q;
    }

    // --- start ---------------------------------------------------------------------------------------------

    @Test
    void startCreatesADraftPinnedToTheCurrentCatalog() {
        StartResult result = service.start(yen, request.getId());

        assertThat(result.created()).isTrue();
        Quotation q = stored.orElseThrow();
        assertThat(q.getCode()).isEqualTo("Q-2026-0189");
        assertThat(q.getVersionNo()).isEqualTo((short) 1);
        assertThat(q.getStatus()).isEqualTo(QuotationStatus.DRAFT);
        assertThat(q.getRateCatalogVersion()).isEqualTo(v2);
        assertThat(q.getCurrency()).isEqualTo("USD");
        assertThat(q.getPreparedBy()).isEqualTo(yen);
        assertThat(q.getAirClass()).isEqualTo(ServiceClass.BUSINESS);
        assertThat(q.getLines())
                .extracting(l -> l.getDescription())
                .containsExactly("Air stall position Phnom Penh → Hong Kong, business", "Flying groom");
        assertThat(q.getLines().getFirst().getRateServiceClass()).isNotNull();
        assertThat(q.getLines().getFirst().getCatalogAmount()).isEqualByComparingTo("16800.00");
        assertThat(q.getLines().get(1).getRateLine().getCode()).isEqualTo("GROOM");
        assertThat(q.getSubtotal()).isEqualByComparingTo("18250.00");
        assertThat(q.getTotal()).isNotNull();
        assertThat(result.quotation().code()).isEqualTo("Q-2026-0189");
    }

    @Test
    void startMovesASubmittedRequestUnderReviewAndAudits() {
        service.start(yen, request.getId());

        assertThat(request.getStatus()).isEqualTo(RequestStatus.UNDER_REVIEW);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_STARTED"),
                        eq("Quotation Q-2026-0189 v1 started on rate catalog v2; the request is under review"),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0199"),
                        isNull(),
                        eq("{\"status\":\"SUBMITTED\"}"),
                        eq("{\"status\":\"UNDER_REVIEW\"}"));
    }

    @Test
    void startingTwiceReturnsTheSameDraft() {
        service.start(yen, request.getId());

        StartResult again = service.start(yen, request.getId());

        assertThat(again.created()).isFalse();
        assertThat(again.quotation().code()).isEqualTo("Q-2026-0189");
        verify(codes, org.mockito.Mockito.times(1)).next(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void aSecondStartAfterTheLockFindsTheFirstDraft() {
        Quotation theirs = issued();
        theirs.setStatus(QuotationStatus.DRAFT);
        stored = Optional.of(theirs);

        StartResult result = service.start(yen, request.getId());

        assertThat(result.created()).isFalse();
        assertThat(result.quotation().id()).isEqualTo(theirs.getId());
        verify(requests).findByIdForUpdate(request.getId());
        verify(quotations, never()).saveAndFlush(any());
    }

    @Test
    void aDuplicateInsertIsAConflictNotA500() {
        org.mockito.Mockito.doThrow(new DataIntegrityViolationException("quotations_request_id_version_no_key"))
                .when(quotations)
                .saveAndFlush(any());

        assertThatThrownBy(() -> service.start(yen, request.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Someone else just started this quotation. Reload the page to see it.")
                .extracting("code")
                .isEqualTo("QUOTATION_ALREADY_STARTED");
    }

    @Test
    void onlyARequestInReviewCanBeQuoted() {
        for (RequestStatus status : List.of(RequestStatus.DRAFT, RequestStatus.INFO_REQUIRED, RequestStatus.QUOTED)) {
            request.setStatus(status);
            assertThatThrownBy(() -> service.start(yen, request.getId()))
                    .isInstanceOf(ConflictException.class)
                    .hasMessage("Only a request in review can be quoted.")
                    .extracting("code")
                    .isEqualTo("REQUEST_NOT_IN_REVIEW");
        }
        verify(quotations, never()).saveAndFlush(any());
    }

    @Test
    void startWithoutAPublishedCatalogIsAConflict() {
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.start(yen, request.getId()))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("NO_PUBLISHED_CATALOG");
    }

    @Test
    void anUnknownRequestIsNotFound() {
        UUID unknown = UUID.randomUUID();
        when(requests.findByIdForUpdate(unknown)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.start(yen, unknown)).isInstanceOf(ResourceNotFoundException.class);
    }

    // --- change class and re-price ---------------------------------------------------------------------------

    @Test
    void changeClassRepricesOnThePinnedVersion() {
        service.start(yen, request.getId());
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v3));

        QuotationDraftResponse response = service.changeClass(yen, request.getId(), ServiceClass.FIRST);

        Quotation q = stored.orElseThrow();
        assertThat(q.getRateCatalogVersion()).isEqualTo(v2);
        assertThat(q.getAirClass()).isEqualTo(ServiceClass.FIRST);
        assertThat(q.getLines().getFirst().getQuantity()).isEqualByComparingTo("2");
        assertThat(response.latestPublishedVersionNo()).isEqualTo(3);
        verify(audit, never())
                .recordDecision(any(), eq("QUOTATION_REPRICED"), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void changeClassOnARoadRequestIsRefused() {
        request.setMode(TransportMode.ROAD);
        request.setAirClass(null);
        request.setTrailer(TrailerType.SHARED);
        service.start(yen, request.getId());

        assertThatThrownBy(() -> service.changeClass(yen, request.getId(), ServiceClass.FIRST))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only an air move has a service class.")
                .extracting("code")
                .isEqualTo("NOT_AN_AIR_REQUEST");
    }

    @Test
    void repricePinsTheLatestAndAudits() {
        service.start(yen, request.getId());
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v3));

        QuotationDraftResponse response = service.reprice(yen, request.getId());

        assertThat(stored.orElseThrow().getRateCatalogVersion()).isEqualTo(v3);
        assertThat(response.pinnedVersion().versionNo()).isEqualTo(3);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_REPRICED"),
                        eq("Quotation Q-2026-0189 v1 re-priced on rate catalog v3"),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0199"),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    void repriceReadsTheCurrentHorses() {
        service.start(yen, request.getId());
        horses.remove(1);

        service.reprice(yen, request.getId());

        Quotation q = stored.orElseThrow();
        assertThat(q.getLines().getFirst().getBasisText())
                .isEqualTo("business gives each horse 48 in · 1 × 48 in = 48 in = 1 position");
    }

    @Test
    void writesOnAnIssuedQuotationAreConflicts() {
        request.setStatus(RequestStatus.UNDER_REVIEW);
        stored = Optional.of(issued());

        for (Runnable write : List.<Runnable>of(
                () -> service.start(yen, request.getId()),
                () -> service.changeClass(yen, request.getId(), ServiceClass.FIRST),
                () -> service.reprice(yen, request.getId()))) {
            assertThatThrownBy(write::run)
                    .isInstanceOf(ConflictException.class)
                    .hasMessage("This version has been issued and can't be changed. Revise it to make a new version.")
                    .extracting("code")
                    .isEqualTo("QUOTATION_NOT_DRAFT");
        }
    }

    @Test
    void repriceOnARequestNoLongerInReviewIsRefused() {
        service.start(yen, request.getId());
        request.setStatus(RequestStatus.INFO_REQUIRED);

        assertThatThrownBy(() -> service.reprice(yen, request.getId()))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("REQUEST_NOT_QUOTABLE");
        assertThatThrownBy(() -> service.changeClass(yen, request.getId(), ServiceClass.FIRST))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("REQUEST_NOT_QUOTABLE");
        assertThat(service.get(request.getId()).code()).isEqualTo("Q-2026-0189");
    }

    @Test
    void getWithoutAQuotationIsNotFound() {
        assertThatThrownBy(() -> service.get(request.getId())).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(audit);
    }

    // --- the response ----------------------------------------------------------------------------------------

    @Test
    void theResponseGroupsLinesAndCarriesTheFitAndReadiness() {
        when(loader.load(v2.getId())).thenReturn(rows(v2, false));

        QuotationDraftResponse response = service.start(yen, request.getId()).quotation();

        assertThat(response.groups())
                .extracting(g -> g.code(), g -> g.name())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("C", "Air freight"),
                        org.assertj.core.groups.Tuple.tuple("D", "Escort"));
        assertThat(response.groups().getFirst().subtotal()).isNull();
        assertThat(response.groups().getFirst().lines().getFirst().source()).isEqualTo(LineSource.MANUAL);
        assertThat(response.groups().getFirst().lines().getFirst().amount()).isNull();
        assertThat(response.groups().get(1).subtotal()).isEqualByComparingTo("1450.00");
        assertThat(response.missing())
                .extracting(m -> m.description())
                .containsExactly("Air stall position Phnom Penh → Hong Kong, business");
        assertThat(response.readiness().ready()).isFalse();
        assertThat(response.readiness().pricedLines()).isEqualTo(1);
        assertThat(response.readiness().lineCount()).isEqualTo(2);
        assertThat(response.totals().total()).isNull();
        assertThat(response.totals().pricedLines()).isEqualByComparingTo("1450.00");
        assertThat(response.fit()).isNull();
        assertThat(response.validityDays()).isEqualTo(7);
        assertThat(response.currency()).isEqualTo("USD");
        assertThat(response.catalogOwner()).isEqualTo("Nguyễn Thị Lan");
        assertThat(response.latestPublishedVersionNo()).isEqualTo(2);
        assertThat(response.request().club()).isEqualTo("Saigon Turf Club");
        assertThat(response.request().horseCount()).isEqualTo(0);
        assertThat(response.repriceNeeded()).isFalse();
    }

    @Test
    void aReadyQuoteSaysSoAndNamesItsBases() {
        QuotationDraftResponse response = service.start(yen, request.getId()).quotation();

        assertThat(response.readiness().ready()).isTrue();
        assertThat(response.fit().positions()).isEqualTo(1);
        assertThat(response.totals().rows())
                .extracting(r -> r.key())
                .containsExactly("FUEL", "INSURANCE", "CONTINGENCY", "SERVICE_FEE");
        assertThat(response.totals().rows().get(2).baseText()).startsWith("10% of $");
    }

    @Test
    void aRequestChangedSincePricingAsksForAReprice() {
        service.start(yen, request.getId());
        horses.remove(1);

        QuotationDraftResponse response = service.get(request.getId());

        assertThat(response.repriceNeeded()).isTrue();
        assertThat(response.readiness().ready()).isFalse();
        assertThat(response.fit().widthUsedIn()).isEqualTo(48);
        verify(audit, never())
                .recordDecision(
                        any(), startsWith("QUOTATION_REPRICED"), any(), any(), any(), any(), any(), any(), any());
    }

    // --- review fixes ------------------------------------------------------------------------------------

    @Test
    void aCoverChangeSinceStartAsksForARepriceAndHidesTheNewRowAmounts() {
        service.start(yen, request.getId());
        request.setInsurance(InsuranceOption.OWN_POLICY);

        QuotationDraftResponse response = service.get(request.getId());

        assertThat(response.repriceNeeded()).isTrue();
        assertThat(response.readiness().ready()).isFalse();
        assertThat(response.totals().rows())
                .allSatisfy(r -> assertThat(r.amount()).isNull());
    }

    @Test
    void aRequestSwitchedToAirAfterStartTakesItsClass() {
        request.setMode(TransportMode.ROAD);
        request.setAirClass(null);
        request.setTrailer(TrailerType.SHARED);
        service.start(yen, request.getId());
        request.setMode(TransportMode.AIR);
        request.setTrailer(null);
        request.setAirClass(ServiceClass.BUSINESS);

        QuotationDraftResponse seen = service.get(request.getId());
        assertThat(seen.airClass()).isEqualTo(ServiceClass.BUSINESS);
        assertThat(seen.repriceNeeded()).isTrue();

        service.reprice(yen, request.getId());
        assertThat(stored.orElseThrow().getAirClass()).isEqualTo(ServiceClass.BUSINESS);
    }

    @Test
    void aRequestSwitchedToRoadDropsTheAirClass() {
        service.start(yen, request.getId());
        request.setMode(TransportMode.ROAD);
        request.setAirClass(null);
        request.setTrailer(TrailerType.SHARED);

        service.reprice(yen, request.getId());

        assertThat(stored.orElseThrow().getAirClass()).isNull();
        assertThat(service.get(request.getId()).airClass()).isNull();
    }

    // --- deferred minors ---------------------------------------------------------------------------------

    /** A request returned to the customer and submitted again goes back under review when Start opens its draft. */
    @Test
    void startOnAResubmittedRequestMovesItUnderReviewAndAudits() {
        service.start(yen, request.getId());
        request.setStatus(RequestStatus.SUBMITTED);
        org.mockito.Mockito.clearInvocations(audit, requests);

        StartResult again = service.start(yen, request.getId());

        assertThat(again.created()).isFalse();
        assertThat(request.getStatus()).isEqualTo(RequestStatus.UNDER_REVIEW);
        verify(requests).save(request);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_RESUMED"),
                        eq("Quotation Q-2026-0189 v1 resumed; the request is under review"),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0199"),
                        isNull(),
                        eq("{\"status\":\"SUBMITTED\"}"),
                        eq("{\"status\":\"UNDER_REVIEW\"}"));
    }

    @Test
    void startOnADraftAlreadyUnderReviewWritesNothing() {
        service.start(yen, request.getId());
        org.mockito.Mockito.clearInvocations(audit, requests);

        service.start(yen, request.getId());

        verify(requests, never()).save(any());
        verifyNoInteractions(audit);
    }

    @Test
    void aRepriceAuditSummaryFitsTheColumn() {
        when(codes.next(CodePrefix.Q, 2026)).thenReturn("Q".repeat(600));
        service.start(yen, request.getId());

        service.reprice(yen, request.getId());

        org.mockito.ArgumentCaptor<String> summary = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(audit)
                .recordDecision(
                        eq(yen), eq("QUOTATION_REPRICED"), summary.capture(), any(), any(), any(), any(), any(), any());
        assertThat(summary.getValue()).hasSize(AuditText.MAX).endsWith("…");
    }

    // --- arrival window (US-Q-05 slice) ------------------------------------------------------------------

    /** A private road move: a per-km road line, a groom and the window surcharge policy. */
    CatalogRows roadWindowRows(RateCatalogVersion v) {
        CatalogRows base = rows(v, true);
        RateLine road = new RateLine();
        road.setId(UUID.randomUUID());
        road.setVersion(v);
        road.setCode("ROAD");
        road.setGroupCode("C");
        road.setDescription("Road freight");
        road.setBasis(RateBasis.PER_KM);
        road.setRate(new BigDecimal("3.60"));
        road.setCertainty(RateCertainty.FIXED);
        List<RatePolicy> policies = new ArrayList<>(base.policies());
        RatePolicy window = new RatePolicy();
        window.setId(new RatePolicy.Key(v.getId(), RatePolicyKey.ARRIVAL_WINDOW_PCT));
        window.setValue(new BigDecimal("20"));
        policies.add(window);
        List<RateLine> lines = new ArrayList<>(base.lines());
        lines.add(road);
        return new CatalogRows(v, List.of(), lines, List.of(), policies, List.of());
    }

    @Test
    void aWindowRequestStoresTheSurcharge() {
        corridor.setMode(TransportMode.ROAD);
        request.setMode(TransportMode.ROAD);
        request.setAirClass(null);
        request.setTrailer(TrailerType.PRIVATE);
        request.setArrivalMode(com.equifreight.entity.enums.ArrivalMode.WINDOW);
        when(loader.load(v2.getId())).thenReturn(roadWindowRows(v2));

        service.start(yen, request.getId());

        // 1,550 km x $3.60 = $5,580.00 of road freight; 20% of it.
        assertThat(stored.orElseThrow().getArrivalWindowSurcharge()).isEqualByComparingTo("1116.00");
    }

    @Test
    void noWindowStoresNoSurcharge() {
        service.start(yen, request.getId());

        assertThat(stored.orElseThrow().getArrivalWindowSurcharge()).isNull();
    }

    // --- slice 6: adjustments survive pricing ------------------------------------------------------------

    QuotationLine lineKeyed(String key) {
        return stored.orElseThrow().getLines().stream()
                .filter(l -> key.equals(l.getLineKey()))
                .findFirst()
                .orElseThrow();
    }

    void overrideGroom(String amount) {
        QuotationLine groom = lineKeyed("GROOM");
        groom.setOverrideAmount(new BigDecimal(amount));
        groom.setOverrideReason("Groom from the club's own staff");
    }

    QuotationLine manualLine(String group, String description, String amount) {
        QuotationLine line = new QuotationLine();
        line.setQuotation(stored.orElseThrow());
        line.setGroupCode(group);
        line.setPosition((short) 9);
        line.setLineKey("MANUAL:" + UUID.randomUUID());
        line.setDescription(description);
        line.setBasis(RateBasis.PER_SHIPMENT);
        line.setBasisText("added by Vũ Thị Yến");
        line.setQuantity(BigDecimal.ONE);
        line.setUnitRate(new BigDecimal(amount));
        line.setCatalogAmount(new BigDecimal(amount));
        line.setSource(LineSource.MANUAL);
        line.setCertainty(LineCertainty.FIXED);
        line.setManualReason("Ferry booking the catalog doesn't know");
        return line;
    }

    CatalogRows rowsWithGroom(RateCatalogVersion v, String groomRate) {
        CatalogRows base = rows(v, true);
        base.lines().getFirst().setRate(new BigDecimal(groomRate));
        return base;
    }

    @Test
    void storedLinesCarryTheirKeys() {
        service.start(yen, request.getId());

        assertThat(stored.orElseThrow().getLines())
                .extracting(QuotationLine::getLineKey)
                .containsExactly("STALL", "GROOM");
    }

    @Test
    void anOverrideSurvivesARepriceByKey() {
        service.start(yen, request.getId());
        overrideGroom("1200.00");
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v3));

        QuotationDraftResponse response = service.reprice(yen, request.getId());

        QuotationLine groom = lineKeyed("GROOM");
        assertThat(groom.getOverrideAmount()).isEqualByComparingTo("1200.00");
        assertThat(groom.getOverrideReason()).isEqualTo("Groom from the club's own staff");
        RateSet rates = rows(v3, true).forCorridor(corridor.getId());
        List<PricedLine> fresh =
                QuotePricer.price(input(ServiceClass.BUSINESS), rates).lines();
        List<PricedLine> adjusted = fresh.stream()
                .map(l -> l.lineKey().equals("GROOM") ? withAmount(l, new BigDecimal("1200.00")) : l)
                .toList();
        BigDecimal expected = QuotePricer.retotal(input(ServiceClass.BUSINESS), rates, adjusted)
                .total();
        assertThat(stored.orElseThrow().getTotal()).isEqualByComparingTo(expected);
        assertThat(response.totals().total()).isEqualByComparingTo(expected);
        assertThat(response.repriceNeeded()).isFalse();
    }

    @Test
    void aCarriedOverrideShowsTheNewCatalogAmount() {
        service.start(yen, request.getId());
        overrideGroom("1200.00");
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v3));
        when(loader.load(v3.getId())).thenReturn(rowsWithGroom(v3, "1600"));

        QuotationDraftResponse response = service.reprice(yen, request.getId());

        QuoteLineResponse groom = response.groups().stream()
                .flatMap(g -> g.lines().stream())
                .filter(l -> "GROOM".equals(l.lineKey()))
                .findFirst()
                .orElseThrow();
        assertThat(groom.catalogAmount()).isEqualByComparingTo("1600.00");
        assertThat(groom.overrideAmount()).isEqualByComparingTo("1200.00");
        assertThat(groom.amount()).isEqualByComparingTo("1200.00");
        assertThat(groom.overrideReason()).isEqualTo("Groom from the club's own staff");
    }

    @Test
    void aManualLineSurvivesARepriceAtTheEndOfItsGroup() {
        service.start(yen, request.getId());
        QuotationLine ferry = manualLine("D", "Ferry booking fee", "180.00");
        stored.orElseThrow().getLines().add(ferry);

        QuotationDraftResponse response = service.reprice(yen, request.getId());

        QuoteGroupResponse d = response.groups().stream()
                .filter(g -> g.code().equals("D"))
                .findFirst()
                .orElseThrow();
        assertThat(d.lines())
                .extracting(QuoteLineResponse::description)
                .containsExactly("Flying groom", "Ferry booking fee");
        QuoteLineResponse kept = d.lines().getLast();
        assertThat(kept.lineKey()).isEqualTo(ferry.getLineKey());
        assertThat(kept.manual()).isTrue();
        assertThat(kept.manualReason()).isEqualTo("Ferry booking the catalog doesn't know");
        assertThat(d.subtotal()).isEqualByComparingTo("1630.00");
    }

    @Test
    void anOverrideWhoseLineVanishedIsDroppedAndNamed() {
        service.start(yen, request.getId());
        QuotationLine vet = manualLine("D", "Flight veterinarian", "2200.00");
        vet.setLineKey("FLIGHT_VET");
        vet.setManualReason(null);
        vet.setSource(LineSource.CATALOG);
        vet.setOverrideAmount(new BigDecimal("2000.00"));
        vet.setOverrideReason("Agreed with the club");
        stored.orElseThrow().getLines().add(vet);

        QuotationDraftResponse response = service.reprice(yen, request.getId());

        assertThat(response.droppedOverrides()).containsExactly("Flight veterinarian: the line is no longer quoted");
        assertThat(stored.orElseThrow().getLines())
                .extracting(QuotationLine::getLineKey)
                .doesNotContain("FLIGHT_VET");
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_REPRICED"),
                        eq("Quotation Q-2026-0189 v1 re-priced on rate catalog v2; override on Flight veterinarian"
                                + " dropped"),
                        any(),
                        any(),
                        any(),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    void aWindowDraftWhoseSurchargeAloneChangedAsksForAReprice() {
        corridor.setMode(TransportMode.ROAD);
        request.setMode(TransportMode.ROAD);
        request.setAirClass(null);
        request.setTrailer(TrailerType.PRIVATE);
        request.setArrivalMode(com.equifreight.entity.enums.ArrivalMode.WINDOW);
        when(loader.load(v2.getId())).thenReturn(roadWindowRows(v2));
        service.start(yen, request.getId());
        stored.orElseThrow().setArrivalWindowSurcharge(new BigDecimal("1000.00"));

        assertThat(service.get(request.getId()).repriceNeeded()).isTrue();
    }

    @Test
    void theRepriceFlagIgnoresManualLines() {
        service.start(yen, request.getId());
        stored.orElseThrow().getLines().add(manualLine("H", "Ferry booking fee", "180.00"));
        service.reprice(yen, request.getId());

        assertThat(service.get(request.getId()).repriceNeeded()).isFalse();
    }

    static PricedLine withAmount(PricedLine l, BigDecimal amount) {
        return new PricedLine(
                l.group(),
                l.lineKey(),
                l.description(),
                l.basis(),
                l.basisText(),
                l.quantity(),
                l.unitRate(),
                amount,
                l.source(),
                l.rateLineId(),
                l.rateServiceClassId(),
                l.horseId(),
                l.certainty(),
                l.estimateNote());
    }

    // --- slice 6: overrides and manual lines -------------------------------------------------------------

    /** Starts the draft and gives its lines ids, as the database would. */
    Quotation startedWithIds() {
        yen.setFirstName("Thị Yến");
        yen.setLastName("Vũ");
        service.start(yen, request.getId());
        Quotation q = stored.orElseThrow();
        q.getLines().forEach(l -> l.setId(UUID.randomUUID()));
        request.setStatus(RequestStatus.UNDER_REVIEW);
        return q;
    }

    static OverrideRequest override(String amount) {
        return new OverrideRequest(new BigDecimal(amount), "Groom from the club's own staff");
    }

    static ManualLineRequest ferry(String unitRate, RateCertainty certainty, String note) {
        return new ManualLineRequest(
                "H",
                "Ferry booking fee",
                new BigDecimal("2"),
                new BigDecimal(unitRate),
                certainty,
                note,
                "Ferry booking the catalog doesn't know");
    }

    @Test
    void anOverrideSetsTheAmountAndReasonAndRetotals() {
        Quotation q = startedWithIds();
        UUID groomId = lineKeyed("GROOM").getId();
        BigDecimal before = q.getTotal();

        QuotationDraftResponse response = service.override(yen, request.getId(), groomId, override("1200.00"));

        QuotationLine groom = lineKeyed("GROOM");
        assertThat(groom.getId()).isEqualTo(groomId);
        assertThat(groom.getOverrideAmount()).isEqualByComparingTo("1200.00");
        assertThat(groom.getOverrideReason()).isEqualTo("Groom from the club's own staff");
        assertThat(q.getTotal()).isLessThan(before);
        assertThat(response.totals().total()).isEqualByComparingTo(q.getTotal());
        assertThat(response.repriceNeeded()).isFalse();
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_LINE_OVERRIDDEN"),
                        eq("Q-2026-0189 v1 · Flying groom: $1,450.00 → $1,200.00 · Groom from the club's own staff"),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0199"),
                        eq("Groom from the club's own staff"),
                        isNull(),
                        isNull());
    }

    @Test
    void aGapLineRefusesAnOverride() {
        when(loader.load(v2.getId())).thenReturn(rows(v2, false));
        Quotation q = startedWithIds();
        UUID gap = q.getLines().stream()
                .filter(l -> l.getCatalogAmount() == null)
                .findFirst()
                .orElseThrow()
                .getId();
        clearInvocations(quotations);

        assertThatThrownBy(() -> service.override(yen, request.getId(), gap, override("100.00")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("A line without a rate can't be overridden. Ask Nguyễn Thị Lan to add the rate, then"
                        + " re-price.")
                .extracting("code")
                .isEqualTo("NO_RATE_TO_OVERRIDE");
        verify(quotations, never()).save(any());
        verify(quotations, never()).saveAndFlush(any());
    }

    @Test
    void removingAnOverrideRestoresTheCatalogAmount() {
        Quotation q = startedWithIds();
        UUID groomId = lineKeyed("GROOM").getId();
        BigDecimal catalogTotal = q.getTotal();
        service.override(yen, request.getId(), groomId, override("1200.00"));

        service.removeOverride(yen, request.getId(), groomId);

        assertThat(lineKeyed("GROOM").getOverrideAmount()).isNull();
        assertThat(lineKeyed("GROOM").getOverrideReason()).isNull();
        assertThat(q.getTotal()).isEqualByComparingTo(catalogTotal);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_OVERRIDE_REMOVED"),
                        eq("Q-2026-0189 v1 · Flying groom: back to $1,450.00 from $1,200.00"),
                        any(),
                        any(),
                        any(),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    void removingWhenNotOverriddenIsAConflict() {
        startedWithIds();

        assertThatThrownBy(() -> service.removeOverride(
                        yen, request.getId(), lineKeyed("GROOM").getId()))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("NOT_OVERRIDDEN");
    }

    @Test
    void aManualLineIsAddedWithItsAmountAndReason() {
        Quotation q = startedWithIds();
        BigDecimal before = q.getTotal();

        service.addLine(yen, request.getId(), ferry("90.00", RateCertainty.FIXED, null));

        QuotationLine added = q.getLines().getLast();
        assertThat(added.getGroupCode()).isEqualTo("H");
        assertThat(added.getCatalogAmount()).isEqualByComparingTo("180.00");
        assertThat(added.getSource()).isEqualTo(LineSource.MANUAL);
        assertThat(added.getBasis()).isEqualTo(RateBasis.PER_SHIPMENT);
        assertThat(added.getBasisText()).isEqualTo("added by Vũ Thị Yến");
        assertThat(added.getLineKey()).startsWith("MANUAL:");
        assertThat(added.getManualReason()).isEqualTo("Ferry booking the catalog doesn't know");
        assertThat(added.getCertainty()).isEqualTo(LineCertainty.FIXED);
        assertThat(q.getTotal()).isGreaterThan(before);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_LINE_ADDED"),
                        eq("Q-2026-0189 v1 · Ferry booking fee, $180.00 · Ferry booking the catalog doesn't know"),
                        any(),
                        any(),
                        any(),
                        eq("Ferry booking the catalog doesn't know"),
                        isNull(),
                        isNull());
    }

    @Test
    void anEstimatedManualLineNeedsANote() {
        startedWithIds();

        assertThatThrownBy(() -> service.addLine(yen, request.getId(), ferry("90.00", RateCertainty.ESTIMATED, " ")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Say why this line may vary.")
                .extracting("code")
                .isEqualTo("ESTIMATE_NOTE");
    }

    @Test
    void aManualLineCanBeEditedAndRemoved() {
        Quotation q = startedWithIds();
        service.addLine(yen, request.getId(), ferry("90.00", RateCertainty.FIXED, null));
        QuotationLine added = q.getLines().getLast();
        added.setId(UUID.randomUUID());

        service.editLine(yen, request.getId(), added.getId(), ferry("100.00", RateCertainty.ESTIMATED, "Ferry tariff"));

        assertThat(added.getCatalogAmount()).isEqualByComparingTo("200.00");
        assertThat(added.getCertainty()).isEqualTo(LineCertainty.ESTIMATED);
        assertThat(added.getEstimateNote()).isEqualTo("Ferry tariff");

        service.removeLine(yen, request.getId(), added.getId());

        assertThat(q.getLines()).doesNotContain(added);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_LINE_REMOVED"),
                        eq("Q-2026-0189 v1 · Ferry booking fee, $200.00 removed"),
                        any(),
                        any(),
                        any(),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    void onlyAManualLineCanBeEditedOrRemoved() {
        startedWithIds();
        UUID groomId = lineKeyed("GROOM").getId();

        for (Runnable write : List.<Runnable>of(
                () -> service.editLine(yen, request.getId(), groomId, ferry("90.00", RateCertainty.FIXED, null)),
                () -> service.removeLine(yen, request.getId(), groomId))) {
            assertThatThrownBy(write::run)
                    .isInstanceOf(ConflictException.class)
                    .hasMessage("Only a line you added can be edited. Override a catalog line instead.")
                    .extracting("code")
                    .isEqualTo("NOT_A_MANUAL_LINE");
        }
    }

    @Test
    void aLineOfAnotherQuotationIsNotFound() {
        startedWithIds();

        assertThatThrownBy(() -> service.override(yen, request.getId(), UUID.randomUUID(), override("1.00")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aV2DraftCanBeWrittenWhileQuoted() {
        Quotation q = startedWithIds();
        q.setVersionNo((short) 2);
        request.setStatus(RequestStatus.QUOTED);

        service.override(yen, request.getId(), lineKeyed("GROOM").getId(), override("1200.00"));

        assertThat(lineKeyed("GROOM").getOverrideAmount()).isEqualByComparingTo("1200.00");
    }

    @Test
    void aV1DraftIsRefusedOnceQuoted() {
        startedWithIds();
        request.setStatus(RequestStatus.QUOTED);

        assertThatThrownBy(() -> service.override(
                        yen, request.getId(), lineKeyed("GROOM").getId(), override("1200.00")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("This request can't be quoted in its current state.")
                .extracting("code")
                .isEqualTo("REQUEST_NOT_QUOTABLE");
    }

    @Test
    void anOverrideAfterIssueIsRefused() {
        Quotation q = startedWithIds();
        UUID groomId = lineKeyed("GROOM").getId();
        q.setStatus(QuotationStatus.ISSUED);
        request.setStatus(RequestStatus.QUOTED);
        clearInvocations(quotations, audit);

        assertThatThrownBy(() -> service.override(yen, request.getId(), groomId, override("1200.00")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("This version has been issued and can't be changed. Revise it to make a new version.")
                .extracting("code")
                .isEqualTo("QUOTATION_NOT_DRAFT");
        assertThat(lineKeyed("GROOM").getOverrideAmount()).isNull();
        verify(quotations, never()).save(any());
        verifyNoInteractions(audit);
    }
}
