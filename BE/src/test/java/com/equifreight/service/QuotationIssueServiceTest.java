package com.equifreight.service;

import static com.equifreight.service.pricing.PricingText.money;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.IssueRequest;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.QuotationVersionResponse;
import com.equifreight.model.quotation.QuoteTotalRowResponse;
import com.equifreight.model.quotation.StartResult;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.PricingHorse;
import com.equifreight.service.quotation.QuotationSnapshot;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** US-F1-05, US-Q-04, US-Q-08: issuing a draft as a document, and refusing it while it isn't ready. */
class QuotationIssueServiceTest extends QuotationServiceFixture {

    static final Instant ISSUE_NOW = Instant.parse("2026-10-20T04:00:00Z");

    NotificationService notifications;
    QuotationIssueService issue;
    User owner;
    User trainer;

    @BeforeEach
    void setUpIssue() {
        notifications = mock(NotificationService.class);
        issue = issueAt(ISSUE_NOW);
        request.getClub().setId(UUID.randomUUID());
        owner = new User();
        owner.setId(UUID.randomUUID());
        trainer = new User();
        trainer.setId(UUID.randomUUID());
        when(users.findByClubId(request.getClub().getId())).thenReturn(List.of(owner, trainer));
    }

    QuotationIssueService issueAt(Instant now) {
        return new QuotationIssueService(
                requests,
                quotations,
                versions,
                pricing,
                users,
                notifications,
                audit,
                snapshots,
                Clock.fixed(now, BusinessTime.ZONE));
    }

    static IssueRequest note(String text) {
        return new IssueRequest(text);
    }

    void assertBlocked(String blocker) {
        clearInvocations(quotations, audit);
        assertThatThrownBy(() -> issue.issue(yen, request.getId(), note(null)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("This quotation isn't ready to issue.")
                .satisfies(e -> assertThat(((ConflictException) e).getDetails()).contains(blocker))
                .extracting("code")
                .isEqualTo("QUOTATION_NOT_READY");
        assertThat(stored.orElseThrow().getStatus()).isEqualTo(QuotationStatus.DRAFT);
        verify(quotations, never()).save(any());
        verify(quotations, never()).saveAndFlush(any());
        verifyNoInteractions(audit, notifications);
    }

    // --- blockers ----------------------------------------------------------------------------------------

    @Test
    void missingRatesBlockIssue() {
        when(loader.load(v2.getId())).thenReturn(rows(v2, false));
        startedWithIds();

        assertBlocked("1 rate is missing on Phnom Penh → Hong Kong.");
    }

    @Test
    void aRefusedFitBlocksIssue() {
        horses.set(
                0,
                new PricingHorse(
                        horses.getFirst().horseId(),
                        "Nightfall",
                        HorseSex.MARE,
                        "XL",
                        96,
                        false,
                        new BigDecimal("175000")));
        startedWithIds();

        assertBlocked("Nightfall is size XL (96 in); business gives 48 in.");
    }

    @Test
    void aStaleDraftBlocksIssue() {
        startedWithIds();
        horses.remove(1);

        assertBlocked("The request changed since this was priced. Re-price it first.");
    }

    @Test
    void noValidityOrDepositBlocksIssue() {
        CatalogRows rows = rows(v2, true);
        rows.policies()
                .removeIf(p ->
                        p.getKey() == RatePolicyKey.QUOTE_VALIDITY_DAYS || p.getKey() == RatePolicyKey.DEPOSIT_PCT);
        when(loader.load(v2.getId())).thenReturn(rows);
        startedWithIds();

        assertBlocked("Rate catalog v2 has no quote validity.");
        assertBlocked("Rate catalog v2 has no deposit percentage.");
    }

    @Test
    void aSecondVersionWithoutANoteIsRefused() {
        Quotation q = startedWithIds();
        q.setVersionNo((short) 2);
        request.setStatus(RequestStatus.QUOTED);

        assertThatThrownBy(() -> issue.issue(yen, request.getId(), note(" ")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Say what changed since version 1.")
                .extracting("code")
                .isEqualTo("CHANGE_NOTE");
        assertThat(q.getStatus()).isEqualTo(QuotationStatus.DRAFT);
    }

    @Test
    void readinessListsTheBlockers() {
        startedWithIds();
        horses.remove(1);

        QuotationDraftResponse response = service.get(request.getId());

        assertThat(response.readiness().ready()).isFalse();
        assertThat(response.readiness().blockers())
                .containsExactly("The request changed since this was priced. Re-price it first.");
    }

    @Test
    void aReadyDraftHasNoBlockers() {
        startedWithIds();

        assertThat(service.get(request.getId()).readiness().blockers()).isEmpty();
        assertThat(service.get(request.getId()).readiness().ready()).isTrue();
    }

    // --- issuing -----------------------------------------------------------------------------------------

    @Test
    void issuingFreezesTheVersion() {
        Quotation q = startedWithIds();
        BigDecimal total = q.getTotal();

        issue.issue(yen, request.getId(), note(null));

        assertThat(q.getStatus()).isEqualTo(QuotationStatus.ISSUED);
        assertThat(q.getIssuedAt()).isEqualTo(ISSUE_NOW);
        assertThat(q.getValidUntil()).isEqualTo(Instant.parse("2026-10-27T16:59:59.999Z"));
        assertThat(q.getDepositPct()).isEqualByComparingTo("30");
        assertThat(q.getDepositAmount())
                .isEqualByComparingTo(
                        total.multiply(new BigDecimal("0.30")).setScale(2, java.math.RoundingMode.HALF_UP));
        assertThat(q.getLatePenaltyPctPerHour()).isNull();
        QuotationSnapshot snapshot = snapshots.read(q.getIssuedSnapshot());
        assertThat(snapshot.rows())
                .extracting(QuotationSnapshot.Row::key)
                .contains("FUEL", "INSURANCE", "CONTINGENCY", "SERVICE_FEE");
        assertThat(snapshot.request().horses())
                .extracting(QuotationSnapshot.Horse::name)
                .containsExactly("Nightfall", "Shadowfax");
        assertThat(snapshot.request().fromCity()).isEqualTo("Phnom Penh");
        assertThat(snapshot.stallNote()).startsWith("Nightfall and Shadowfax fly business class at 48 in each");
        assertThat(request.getStatus()).isEqualTo(RequestStatus.QUOTED);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_ISSUED"),
                        eq("Quotation Q-2026-0189 v1 issued: " + money(total) + ", valid until 27 Oct 2026"),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0199"),
                        isNull(),
                        eq("{\"status\":\"UNDER_REVIEW\"}"),
                        eq("{\"status\":\"QUOTED\"}"));
        for (User account : List.of(owner, trainer)) {
            verify(notifications)
                    .sendNotification(
                            account,
                            "QUOTATION_ISSUED",
                            "Your quotation for REQ-2026-0199 is ready",
                            "Quotation Q-2026-0189 v1, " + money(total) + ". It holds its price until 27 Oct 2026.",
                            "TRANSPORT_REQUEST",
                            request.getId());
        }
    }

    @Test
    void issuedLateEveningLocalHoldsUntilEndOfDayPlusSeven() {
        Quotation q = startedWithIds();

        issueAt(Instant.parse("2026-10-20T16:30:00Z")).issue(yen, request.getId(), note(null));

        assertThat(q.getValidUntil()).isEqualTo(Instant.parse("2026-10-27T16:59:59.999Z"));
    }

    @Test
    void theLatePenaltyIsCopiedOnlyWithAWindow() {
        corridor.setMode(TransportMode.ROAD);
        request.setMode(TransportMode.ROAD);
        request.setAirClass(null);
        request.setTrailer(TrailerType.PRIVATE);
        request.setArrivalMode(ArrivalMode.WINDOW);
        CatalogRows rows = roadWindowRows(v2);
        rows.policies().add(policy(RatePolicyKey.LATE_PENALTY_PCT_PER_HOUR, "10"));
        rows.policies().add(policy(RatePolicyKey.LATE_PENALTY_CAP_PCT, "30"));
        when(loader.load(v2.getId())).thenReturn(rows);
        Quotation q = startedWithIds();

        issue.issue(yen, request.getId(), note(null));

        assertThat(q.getLatePenaltyPctPerHour()).isEqualByComparingTo("10");
        assertThat(q.getLatePenaltyCapPct()).isEqualByComparingTo("30");
        assertThat(snapshots.read(q.getIssuedSnapshot()).stallNote()).isNull();
    }

    RatePolicy policy(RatePolicyKey key, String value) {
        RatePolicy p = new RatePolicy();
        p.setVersion(v2);
        p.setKey(key);
        p.setValue(new BigDecimal(value));
        return p;
    }

    @Test
    void issuingV2SupersedesAnIssuedV1WithTheNote() {
        Quotation v1 = issued();
        Quotation q = startedWithIds();
        q.setVersionNo((short) 2);
        request.setStatus(RequestStatus.QUOTED);
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenReturn(List.of(q, v1));

        issue.issue(yen, request.getId(), note("Departure moved from 12 Nov to 20 Nov."));

        assertThat(v1.getStatus()).isEqualTo(QuotationStatus.SUPERSEDED);
        assertThat(v1.getSupersededReason()).isEqualTo("Departure moved from 12 Nov to 20 Nov.");
        assertThat(q.getStatus()).isEqualTo(QuotationStatus.ISSUED);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_ISSUED"),
                        eq("Quotation Q-2026-0189 v2 issued: " + money(q.getTotal())
                                + ", valid until 27 Oct 2026; supersedes v1"),
                        any(),
                        any(),
                        any(),
                        eq("Departure moved from 12 Nov to 20 Nov."),
                        eq("{\"status\":\"QUOTED\"}"),
                        eq("{\"status\":\"QUOTED\"}"));
    }

    @Test
    void issuingV2LeavesAnExpiredV1Expired() {
        Quotation v1 = issued();
        v1.setStatus(QuotationStatus.EXPIRED);
        Quotation q = startedWithIds();
        q.setVersionNo((short) 2);
        request.setStatus(RequestStatus.EXPIRED);
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenReturn(List.of(q, v1));

        issue.issue(yen, request.getId(), note("Re-priced after it expired."));

        assertThat(v1.getStatus()).isEqualTo(QuotationStatus.EXPIRED);
        assertThat(v1.getSupersededReason()).isNull();
        assertThat(request.getStatus()).isEqualTo(RequestStatus.QUOTED);
    }

    @Test
    void issuingTwiceIsRefusedAndNotifiesOnce() {
        startedWithIds();
        issue.issue(yen, request.getId(), note(null));

        assertThatThrownBy(() -> issue.issue(yen, request.getId(), note(null)))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("QUOTATION_NOT_DRAFT");
        verify(notifications, times(2))
                .sendNotification(any(), eq("QUOTATION_ISSUED"), anyString(), any(), any(), any());
    }

    // --- revising and discarding (US-Q-07) ---------------------------------------------------------------

    /** v1 issued on v2 with FIRST, a groom override and a manual H line; the request quoted. */
    Quotation issuedV1WithAdjustments() {
        Quotation q = startedWithIds();
        service.changeClass(yen, request.getId(), ServiceClass.FIRST);
        q.getLines().forEach(l -> {
            if (l.getId() == null) {
                l.setId(UUID.randomUUID());
            }
        });
        service.override(yen, request.getId(), lineKeyed("GROOM").getId(), override("1200.00"));
        service.addLine(yen, request.getId(), ferry("90.00", RateCertainty.FIXED, null));
        issue.issue(yen, request.getId(), note(null));
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenAnswer(i -> {
            Quotation latest = stored.orElseThrow();
            return latest == q ? List.of(q) : List.of(latest, q);
        });
        clearInvocations(audit);
        return q;
    }

    @Test
    void reviseCopiesClassOverridesAndManualLinesOnTheLatestCatalog() {
        Quotation v1 = issuedV1WithAdjustments();
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v3));

        StartResult result = issue.revise(yen, request.getId());

        Quotation v2 = stored.orElseThrow();
        assertThat(result.created()).isTrue();
        assertThat(v2).isNotSameAs(v1);
        assertThat(v2.getCode()).isEqualTo("Q-2026-0189");
        assertThat(v2.getVersionNo()).isEqualTo((short) 2);
        assertThat(v2.getStatus()).isEqualTo(QuotationStatus.DRAFT);
        assertThat(v2.getRateCatalogVersion()).isEqualTo(v3);
        assertThat(v2.getAirClass()).isEqualTo(ServiceClass.FIRST);
        assertThat(v2.getPreparedBy()).isEqualTo(yen);
        assertThat(lineKeyed("GROOM").getOverrideAmount()).isEqualByComparingTo("1200.00");
        assertThat(v2.getLines()).anySatisfy(l -> assertThat(l.getDescription()).isEqualTo("Ferry booking fee"));
        assertThat(v1.getStatus()).isEqualTo(QuotationStatus.ISSUED);
        assertThat(v1.getLines()).hasSize(v2.getLines().size());
        assertThat(request.getStatus()).isEqualTo(RequestStatus.QUOTED);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_REVISED"),
                        eq("Quotation Q-2026-0189 v2 drafted from v1 on rate catalog v3"),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0199"),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    void aRevisionCanBeEditedAndIssuedWhileV1StaysLive() {
        Quotation v1 = issuedV1WithAdjustments();
        issue.revise(yen, request.getId());
        Quotation v2 = stored.orElseThrow();
        v2.getLines().forEach(l -> l.setId(UUID.randomUUID()));

        service.removeOverride(yen, request.getId(), lineKeyed("GROOM").getId());
        issue.issue(yen, request.getId(), note("Groom back at the catalog rate."));

        assertThat(v1.getStatus()).isEqualTo(QuotationStatus.SUPERSEDED);
        assertThat(v1.getSupersededReason()).isEqualTo("Groom back at the catalog rate.");
        assertThat(v2.getStatus()).isEqualTo(QuotationStatus.ISSUED);
    }

    @Test
    void reviseCarriesAnOverrideFromAVersionPricedBeforeLineKeys() {
        Quotation v1 = issuedV1WithAdjustments();
        v1.getLines().stream().filter(l -> l.getManualReason() == null).forEach(l -> l.setLineKey(null));

        StartResult result = issue.revise(yen, request.getId());

        assertThat(lineKeyed("GROOM").getOverrideAmount()).isEqualByComparingTo("1200.00");
        assertThat(result.quotation().droppedOverrides()).isEmpty();
    }

    @Test
    void reviseRefusals() {
        startedWithIds();
        request.setStatus(RequestStatus.QUOTED);
        assertThatThrownBy(() -> issue.revise(yen, request.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Version 1 is already being drafted.")
                .extracting("code")
                .isEqualTo("DRAFT_EXISTS");

        stored = Optional.empty();
        assertThatThrownBy(() -> issue.revise(yen, request.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("There is no issued quotation to revise.")
                .extracting("code")
                .isEqualTo("NOTHING_TO_REVISE");

        stored = Optional.of(issued());
        request.setStatus(RequestStatus.CANCELLED);
        assertThatThrownBy(() -> issue.revise(yen, request.getId()))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("REQUEST_NOT_QUOTABLE");
    }

    @Test
    void discardingAV2DraftLeavesV1() {
        Quotation v1 = issuedV1WithAdjustments();
        issue.revise(yen, request.getId());
        Quotation v2 = stored.orElseThrow();

        issue.discardDraft(yen, request.getId());

        verify(quotations).delete(v2);
        assertThat(v1.getStatus()).isEqualTo(QuotationStatus.ISSUED);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("QUOTATION_DRAFT_DISCARDED"),
                        eq("Quotation Q-2026-0189 v2 draft discarded; v1 stands"),
                        any(),
                        any(),
                        any(),
                        isNull(),
                        isNull(),
                        isNull());
    }

    @Test
    void theFirstVersionCantBeDiscarded() {
        startedWithIds();

        assertThatThrownBy(() -> issue.discardDraft(yen, request.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("The first version can't be discarded.")
                .extracting("code")
                .isEqualTo("FIRST_VERSION");
        verify(quotations, never()).delete(any());
    }

    // --- reading an issued version (spec §5.5) -----------------------------------------------------------

    @Test
    void anIssuedVersionIsReadFromItsSnapshot() {
        Quotation v1 = issuedV1WithAdjustments();
        List<QuotationSnapshot.Row> rows =
                snapshots.read(v1.getIssuedSnapshot()).rows();
        when(quotations.findByRequestIdAndVersionNo(request.getId(), (short) 1)).thenReturn(Optional.of(v1));
        clearInvocations(loader, inputs);

        QuotationDraftResponse response = service.get(request.getId(), (short) 1);

        assertThat(response.status()).isEqualTo(QuotationStatus.ISSUED);
        assertThat(response.readiness()).isNull();
        assertThat(response.totals().rows())
                .extracting(QuoteTotalRowResponse::baseText)
                .containsExactlyElementsOf(
                        rows.stream().map(QuotationSnapshot.Row::baseText).toList());
        assertThat(response.issuedAt()).isEqualTo(ISSUE_NOW);
        assertThat(response.validUntil()).isEqualTo(Instant.parse("2026-10-27T16:59:59.999Z"));
        assertThat(response.deposit().pct()).isEqualByComparingTo("30");
        assertThat(response.fit().positions()).isEqualTo(2);
        verifyNoInteractions(loader, inputs);
    }

    @Test
    void aDraftCarriesThePreviousVersionsAmountsAndEveryVersion() {
        Quotation v1 = issuedV1WithAdjustments();
        issue.revise(yen, request.getId());

        QuotationDraftResponse response = service.get(request.getId(), null);

        assertThat(response.versionNo()).isEqualTo((short) 2);
        assertThat(response.previous().versionNo()).isEqualTo((short) 1);
        assertThat(response.previous().total()).isEqualByComparingTo(v1.getTotal());
        assertThat(response.previous().amountsByKey().get("GROOM")).isEqualByComparingTo("1200.00");
        assertThat(response.versions())
                .extracting(QuotationVersionResponse::versionNo)
                .containsExactly((short) 2, (short) 1);
        assertThat(response.versions().get(1).validUntil()).isEqualTo(Instant.parse("2026-10-27T16:59:59.999Z"));
    }

    @Test
    void anUnknownVersionIsNotFound() {
        startedWithIds();

        assertThatThrownBy(() -> service.get(request.getId(), (short) 7)).isInstanceOf(ResourceNotFoundException.class);
    }
}
