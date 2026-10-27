package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.QuoteGroupResponse;
import com.equifreight.model.quotation.QuoteLineResponse;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.service.pricing.PricedLine;
import com.equifreight.service.pricing.QuotePricer;
import com.equifreight.service.pricing.RateSet;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

/** US-Q-01, US-Q-03, US-Q-09: starting and re-pricing a draft quotation from the rate catalog. */
class QuotationDraftServiceTest extends QuotationServiceFixture {
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
    void changingTheClassIsAudited() {
        service.start(yen, request.getId());

        service.changeClass(yen, request.getId(), ServiceClass.FIRST);

        verify(audit)
                .recordDecision(
                        yen,
                        "QUOTATION_CLASS_CHANGED",
                        "Quotation Q-2026-0189 v1 priced in first class instead of business",
                        "TRANSPORT_REQUEST",
                        request.getId(),
                        request.getCode(),
                        null,
                        null,
                        null);
    }

    @Test
    void choosingTheSameClassAuditsNothing() {
        service.start(yen, request.getId());

        service.changeClass(yen, request.getId(), ServiceClass.BUSINESS);

        verify(audit, never())
                .recordDecision(any(), eq("QUOTATION_CLASS_CHANGED"), any(), any(), any(), any(), any(), any(), any());
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
    void theFinalInvoiceRetotalsWithoutRequiringWeights() {
        service.start(yen, request.getId());

        pricing.totalsWith(stored.orElseThrow(), request, new java.util.HashMap<>());

        // BR-Q-16: weight never prices a line, so an accepted quote's totals don't wait on weights or limits.
        verify(inputs).inputFor(eq(request), any(), eq(false), any());
    }

    @Test
    void aReadyQuoteSaysSoAndNamesItsBases() {
        QuotationDraftResponse response = service.start(yen, request.getId()).quotation();

        assertThat(response.readiness().ready()).isTrue();
        assertThat(response.fit().positions()).isEqualTo(1);
        // BR-Q-16: the two fixture horses at 500 kg each.
        assertThat(response.fit().totalWeightKg()).isEqualTo(1000);
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

    /** A draft priced before V23: its lines have no keys. */
    Quotation legacyDraftWithIds() {
        Quotation q = startedWithIds();
        q.getLines().forEach(l -> l.setLineKey(null));
        return q;
    }

    @Test
    void anOverrideOnALineWithoutAKeyDoesNotAskForAReprice() {
        Quotation q = legacyDraftWithIds();
        UUID groom = q.getLines().stream()
                .filter(l -> l.getDescription().equals("Flying groom"))
                .findFirst()
                .orElseThrow()
                .getId();

        QuotationDraftResponse response = service.override(yen, request.getId(), groom, override("1200.00"));

        assertThat(response.repriceNeeded()).isFalse();
        assertThat(response.readiness().ready()).isTrue();
    }

    @Test
    void aRepriceCarriesAnOverrideOnALineWithoutAKey() {
        Quotation q = legacyDraftWithIds();
        QuotationLine groom = q.getLines().stream()
                .filter(l -> l.getDescription().equals("Flying groom"))
                .findFirst()
                .orElseThrow();
        groom.setOverrideAmount(new BigDecimal("1200.00"));
        groom.setOverrideReason("Groom from the club's own staff");

        QuotationDraftResponse response = service.reprice(yen, request.getId());

        assertThat(lineKeyed("GROOM").getOverrideAmount()).isEqualByComparingTo("1200.00");
        assertThat(response.droppedOverrides()).isEmpty();
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

    // --- slice 6: overrides and manual lines -------------------------------------------------------------

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
