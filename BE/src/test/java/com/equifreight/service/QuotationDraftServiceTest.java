package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.startsWith;
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
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.PricingHorse;
import com.equifreight.service.pricing.PricingInput;
import com.equifreight.service.pricing.PricingInputs;
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
                loader,
                inputs,
                codes,
                users,
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
                InsuranceOption.EQUIFREIGHT,
                false,
                0,
                List.copyOf(horses));
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
                    .hasMessage("This quotation has been issued and can't be re-priced.")
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
                .isEqualTo("REQUEST_NOT_IN_REVIEW");
        assertThatThrownBy(() -> service.changeClass(yen, request.getId(), ServiceClass.FIRST))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("REQUEST_NOT_IN_REVIEW");
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
}
