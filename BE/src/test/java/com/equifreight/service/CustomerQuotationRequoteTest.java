package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.CustomerQuotationResponse;
import com.equifreight.model.quotation.IssueRequest;
import com.equifreight.model.quotation.RequoteRequest;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import com.equifreight.service.pricing.CatalogRows;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Core flows A4: on expiry the customer asks for a re-quote, which drafts the next version for the manager. */
class CustomerQuotationRequoteTest extends QuotationServiceFixture {

    static final Instant ISSUED_AT = Instant.parse("2026-10-20T04:00:00Z");
    /** 29 Oct, after v1's validity ended (27 Oct); the departure is 20 Nov. */
    static final Instant ASKED_AT = Instant.parse("2026-10-29T04:00:00Z");

    NotificationService notifications;
    InvoiceService invoices;
    RateFeeBandRepository feeBands;
    ClubService clubs;
    QuotationIssueService issue;
    Club club;
    User bookings;
    Quotation v1;

    @BeforeEach
    void setUpRequote() {
        notifications = mock(NotificationService.class);
        invoices = mock(InvoiceService.class);
        feeBands = mock(RateFeeBandRepository.class);
        clubs = mock(ClubService.class);
        issue = new QuotationIssueService(
                requests,
                quotations,
                versions,
                pricing,
                notifications,
                audit,
                snapshots,
                Clock.fixed(ISSUED_AT, BusinessTime.ZONE));
        club = request.getClub();
        club.setId(UUID.randomUUID());
        bookings = new User();
        when(clubs.requireClub(bookings)).thenReturn(club);
        when(requests.findForUpdate(request.getId(), club.getId())).thenReturn(Optional.of(request));

        // v1 issued with the business class changed to first, the groom overridden and a ferry line added.
        Quotation q = startedWithIds();
        service.changeClass(yen, request.getId(), ServiceClass.FIRST);
        q.getLines().forEach(l -> {
            if (l.getId() == null) {
                l.setId(UUID.randomUUID());
            }
        });
        service.override(yen, request.getId(), lineKeyed("GROOM").getId(), override("1200.00"));
        service.addLine(yen, request.getId(), ferry("90.00", RateCertainty.FIXED, null));
        issue.issue(yen, request.getId(), new IssueRequest(null));
        v1 = q;
        v1.setStatus(QuotationStatus.EXPIRED);
        request.setStatus(RequestStatus.EXPIRED);

        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(v1));
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenAnswer(i -> {
            Quotation latest = stored.orElseThrow();
            return latest == v1 ? List.of(v1) : List.of(latest, v1);
        });
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(v3));
        clearInvocations(audit, notifications, quotations, requests);
    }

    CustomerQuotationService at(Instant now) {
        return new CustomerQuotationService(
                requests,
                quotations,
                feeBands,
                clubs,
                snapshots,
                audit,
                notifications,
                invoices,
                issue,
                Clock.fixed(now, BusinessTime.ZONE));
    }

    CustomerQuotationResponse ask(RequoteRequest body) {
        return at(ASKED_AT).requote(bookings, request.getId(), body);
    }

    Quotation v2() {
        Quotation latest = stored.orElseThrow();
        assertThat(latest).isNotSameAs(v1);
        return latest;
    }

    // --- the happy path --------------------------------------------------------------------------------------

    @Test
    void aRequoteDraftsTheNextVersionForTheManager() {
        CustomerQuotationResponse r = ask(new RequoteRequest(1, "  Two horses now  "));

        Quotation v2 = v2();
        assertThat(v2.getVersionNo()).isEqualTo((short) 2);
        assertThat(v2.getStatus()).isEqualTo(QuotationStatus.DRAFT);
        assertThat(v2.getCode()).isEqualTo("Q-2026-0189");
        assertThat(v2.getPreparedBy()).isSameAs(yen);
        assertThat(v2.getRateCatalogVersion()).isSameAs(v3);
        assertThat(v2.getAirClass()).isEqualTo(ServiceClass.FIRST);
        assertThat(lineKeyed("GROOM").getOverrideAmount()).isEqualByComparingTo("1200.00");
        assertThat(v2.getLines())
                .anySatisfy(l -> assertThat(l.getManualReason()).isEqualTo("Ferry booking the catalog doesn't know"));
        assertThat(request.getStatus()).isEqualTo(RequestStatus.EXPIRED);
        assertThat(v1.getStatus()).isEqualTo(QuotationStatus.EXPIRED);
        assertThat(r.versionNo()).isEqualTo((short) 1);
        verify(audit)
                .recordDecision(
                        eq(bookings),
                        eq("QUOTATION_REQUOTE_ASKED"),
                        eq("Saigon Turf Club asked for a re-quote of Q-2026-0189 v1; v2 drafted on rate catalog v3"),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0199"),
                        eq("Two horses now"),
                        eq(null),
                        eq(null));
        verify(notifications)
                .notify(
                        NotificationKind.QUOTATION_REQUOTE_ASKED,
                        Audience.staff(yen),
                        Subject.request(request),
                        "Saigon Turf Club asked for a re-quote of Q-2026-0189",
                        "“Two horses now”");
    }

    @Test
    void withoutANoteTheBodyNamesTheDraft() {
        ask(new RequoteRequest(null, "   "));

        verify(notifications)
                .notify(
                        eq(NotificationKind.QUOTATION_REQUOTE_ASKED),
                        any(),
                        any(),
                        anyString(),
                        eq("REQ-2026-0199 · version 2 is drafted on rate catalog v3. Review it and issue it."));
        verify(audit)
                .recordDecision(
                        any(), eq("QUOTATION_REQUOTE_ASKED"), anyString(), any(), any(), any(), eq(null), any(), any());
    }

    @Test
    void aDroppedOverrideIsNamedInTheAudit() {
        CatalogRows base = rows(v3, true);
        when(loader.load(v3.getId()))
                .thenReturn(new CatalogRows(
                        v3, base.classes(), List.of(), base.breaks(), base.policies(), base.feeBands()));

        ask(null);

        verify(audit)
                .recordDecision(
                        any(),
                        eq("QUOTATION_REQUOTE_ASKED"),
                        eq("Saigon Turf Club asked for a re-quote of Q-2026-0189 v1; v2 drafted on rate catalog v3;"
                                + " override on Flying groom dropped"),
                        any(),
                        any(),
                        any(),
                        any(),
                        any(),
                        any());
    }

    @Test
    void noPreparerNotifiesEveryLogisticsManager() {
        v1.setPreparedBy(null);

        ask(null);

        assertThat(v2().getPreparedBy()).isNull();
        verify(notifications)
                .notify(
                        eq(NotificationKind.QUOTATION_REQUOTE_ASKED),
                        eq(Audience.role(RoleName.LOGISTICS_MANAGER)),
                        any(),
                        anyString(),
                        anyString());
    }

    // --- refusals, in the spec's order (§4.3 step 3) ---------------------------------------------------------

    void assertRefused(ThrowingCallable ask, String code, String message) {
        var thrown = assertThatThrownBy(ask).isInstanceOf(ConflictException.class);
        if (message != null) {
            thrown.hasMessage(message);
        }
        thrown.extracting("code").isEqualTo(code);
        verify(quotations, never()).saveAndFlush(any());
        verifyNoInteractions(audit, notifications);
    }

    @Test
    void aSecondAskIsRefused() {
        ask(null);
        clearInvocations(audit, notifications, quotations);

        assertRefused(() -> ask(null), "REQUOTE_IN_PROGRESS", "Version 2 is already being prepared.");
    }

    @Test
    void aDeclinedQuotationCantBeRequoted() {
        v1.setStatus(QuotationStatus.DECLINED);
        v1.setDeclinedAt(Instant.parse("2026-10-24T03:00:00Z"));

        assertRefused(() -> ask(null), "QUOTATION_ANSWERED", "You declined version 1 on 24 Oct 2026.");
    }

    @Test
    void anAcceptedQuotationCantBeRequoted() {
        v1.setStatus(QuotationStatus.ACCEPTED);
        v1.setAcceptedAt(Instant.parse("2026-10-24T03:00:00Z"));
        request.setStatus(RequestStatus.CUSTOMER_ACCEPTED);

        assertRefused(() -> ask(null), "QUOTATION_ANSWERED", "You accepted version 1 on 24 Oct 2026.");
    }

    @Test
    void aCancelledRequestIsRefusedBeforeItsExpiry() {
        request.setStatus(RequestStatus.CANCELLED);

        assertRefused(() -> ask(null), "REQUEST_CANCELLED", null);
    }

    @Test
    void anOpenQuotationCantBeRequoted() {
        v1.setStatus(QuotationStatus.ISSUED);
        request.setStatus(RequestStatus.QUOTED);

        assertRefused(
                () -> ask(null),
                "QUOTATION_NOT_EXPIRED",
                "Version 1 hasn't expired. You can still accept or decline it.");
    }

    @Test
    void departureTodayIsRefusedAtTheZoneBoundary() {
        // 01:00 on 26 Oct in Ho Chi Minh City, still 25 Oct in UTC.
        Instant lateNight = Instant.parse("2026-10-25T18:00:00Z");
        request.setDepartureDate(LocalDate.of(2026, 10, 26));

        assertRefused(
                () -> at(lateNight).requote(bookings, request.getId(), null),
                "DEPARTURE_PASSED",
                "The departure on 26 Oct 2026 has passed. Start a new request for a later date.");

        request.setDepartureDate(LocalDate.of(2026, 10, 27));
        at(lateNight).requote(bookings, request.getId(), null);
        assertThat(v2().getVersionNo()).isEqualTo((short) 2);
    }

    @Test
    void aStaleVersionNoIsRefused() {
        v1.setVersionNo((short) 2);

        assertRefused(
                () -> ask(new RequoteRequest(1, null)),
                "QUOTATION_VERSION_CHANGED",
                "Version 1 was replaced by version 2. Read it before you answer.");
    }

    @Test
    void anotherClubsRequestIsNotFound() {
        User other = new User();
        Club elsewhere = new Club();
        elsewhere.setId(UUID.randomUUID());
        when(clubs.requireClub(other)).thenReturn(elsewhere);

        assertThatThrownBy(() -> at(ASKED_AT).requote(other, request.getId(), null))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(quotations, never()).saveAndFlush(any());
    }
}
