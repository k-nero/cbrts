package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.quotation.CustomerQuotationResponse;
import com.equifreight.model.quotation.DeclineRequest;
import com.equifreight.model.quotation.IssueRequest;
import com.equifreight.repository.RateFeeBandRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** US-F1-06: the club accepts or declines the issued quotation, only while it is open and before it expires. */
class CustomerQuotationAnswerTest extends QuotationServiceFixture {

    static final Instant ISSUED_AT = Instant.parse("2026-10-20T04:00:00Z");
    /** Valid until the end of 27 Oct in Ho Chi Minh City; this is 28 Oct there. */
    static final Instant AFTER_EXPIRY = Instant.parse("2026-10-27T17:30:00Z");

    NotificationService notifications;
    QuotationIssueService issue;
    RateFeeBandRepository feeBands;
    ClubService clubs;
    Club club;
    User bookings;
    Quotation q;

    @BeforeEach
    void setUpAnswer() {
        notifications = mock(NotificationService.class);
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
        club.setName("Phnom Penh Royal Turf Club");
        bookings = new User();
        when(clubs.requireClub(bookings)).thenReturn(club);
        when(requests.findForUpdate(request.getId(), club.getId())).thenReturn(Optional.of(request));
        when(requests.findByIdAndClubId(request.getId(), club.getId())).thenReturn(Optional.of(request));

        q = startedWithIds();
        issue.issue(yen, request.getId(), new IssueRequest(null));
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(q));
        when(quotations.findByRequestIdOrderByVersionNoDesc(request.getId())).thenReturn(List.of(q));
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
                Clock.fixed(now, BusinessTime.ZONE));
    }

    CustomerQuotationService customer() {
        return at(ISSUED_AT.plusSeconds(3_600));
    }

    @Test
    void acceptingBindsTheIssuedVersionAndWaitsForApproval() {
        CustomerQuotationResponse r = customer().accept(bookings, request.getId());

        assertThat(q.getStatus()).isEqualTo(QuotationStatus.ACCEPTED);
        assertThat(q.getAcceptedAt()).isEqualTo(ISSUED_AT.plusSeconds(3_600));
        assertThat(q.getAcceptedBy()).isSameAs(bookings);
        assertThat(request.getStatus()).isEqualTo(RequestStatus.CUSTOMER_ACCEPTED);
        assertThat(r.status()).isEqualTo(QuotationStatus.ACCEPTED);
        assertThat(r.requestStatus()).isEqualTo(RequestStatus.CUSTOMER_ACCEPTED);
        assertThat(r.versionNo()).isEqualTo((short) 1);
        assertThat(r.acceptedAt()).isEqualTo(ISSUED_AT.plusSeconds(3_600));
        verify(audit)
                .recordDecision(
                        eq(bookings),
                        eq("QUOTATION_ACCEPTED"),
                        anyString(),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0199"),
                        isNull(),
                        eq("{\"status\":\"QUOTED\"}"),
                        eq("{\"status\":\"CUSTOMER_ACCEPTED\"}"));
        verify(notifications)
                .notify(
                        eq(NotificationKind.QUOTATION_ACCEPTED),
                        eq(Audience.staff(yen)),
                        eq(Subject.request(request)),
                        eq("Phnom Penh Royal Turf Club accepted Quotation Q-2026-0189 v1"),
                        anyString());
    }

    @Test
    void theLastValidDayStillAccepts() {
        at(AFTER_EXPIRY.minusSeconds(3_600)).accept(bookings, request.getId());

        assertThat(q.getStatus()).isEqualTo(QuotationStatus.ACCEPTED);
    }

    @Test
    void anExpiredQuotationCantBeAcceptedEvenBeforeTheJobExpiresIt() {
        assertThatThrownBy(() -> at(AFTER_EXPIRY).accept(bookings, request.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Version 1 expired on 27 Oct 2026, so it can't be answered. Ask the logistics manager to"
                        + " re-price it.")
                .extracting("code")
                .isEqualTo("QUOTATION_EXPIRED");
        assertNothingWritten();
    }

    @Test
    void aQuotationTheJobExpiredCantBeAccepted() {
        q.setStatus(QuotationStatus.EXPIRED);
        request.setStatus(RequestStatus.EXPIRED);

        assertThatThrownBy(() -> customer().accept(bookings, request.getId()))
                .extracting("code")
                .isEqualTo("QUOTATION_EXPIRED");
        assertNothingWritten();
    }

    @Test
    void anAcceptedVersionCantBeAnsweredAgain() {
        customer().accept(bookings, request.getId());
        clearInvocations(audit, notifications, quotations, requests);

        assertThatThrownBy(() -> customer().accept(bookings, request.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("You accepted version 1 on 20 Oct 2026.")
                .extracting("code")
                .isEqualTo("QUOTATION_ANSWERED");
        assertThatThrownBy(() -> customer().decline(bookings, request.getId(), null))
                .extracting("code")
                .isEqualTo("QUOTATION_ANSWERED");
        assertThat(q.getStatus()).isEqualTo(QuotationStatus.ACCEPTED);
        assertNothingWritten();
    }

    @Test
    void aCancelledRequestsQuotationCantBeAnswered() {
        request.setStatus(RequestStatus.CANCELLED);

        assertThatThrownBy(() -> customer().accept(bookings, request.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("REQ-2026-0199 was cancelled, so its quotation can't be answered.")
                .extracting("code")
                .isEqualTo("REQUEST_CANCELLED");
        assertNothingWritten();
    }

    @Test
    void anotherClubsRequestIsNotFound() {
        User other = new User();
        Club otherClub = new Club();
        otherClub.setId(UUID.randomUUID());
        when(clubs.requireClub(other)).thenReturn(otherClub);

        assertThatThrownBy(() -> customer().accept(other, request.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> customer().decline(other, request.getId(), null))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(q.getStatus()).isEqualTo(QuotationStatus.ISSUED);
    }

    @Test
    void decliningClosesTheRequestWithTheReason() {
        CustomerQuotationResponse r =
                customer().decline(bookings, request.getId(), new DeclineRequest("  Owner chose another carrier  "));

        assertThat(q.getStatus()).isEqualTo(QuotationStatus.DECLINED);
        assertThat(q.getDeclinedAt()).isEqualTo(ISSUED_AT.plusSeconds(3_600));
        assertThat(q.getDeclineReason()).isEqualTo("Owner chose another carrier");
        assertThat(request.getStatus()).isEqualTo(RequestStatus.EXPIRED);
        assertThat(r.status()).isEqualTo(QuotationStatus.DECLINED);
        assertThat(r.requestStatus()).isEqualTo(RequestStatus.EXPIRED);
        verify(audit)
                .recordDecision(
                        eq(bookings),
                        eq("QUOTATION_DECLINED"),
                        eq("Quotation Q-2026-0189 v1 declined: Owner chose another carrier"),
                        eq("TRANSPORT_REQUEST"),
                        eq(request.getId()),
                        eq("REQ-2026-0199"),
                        eq("Owner chose another carrier"),
                        eq("{\"status\":\"QUOTED\"}"),
                        eq("{\"status\":\"EXPIRED\"}"));
        verify(notifications)
                .notify(
                        eq(NotificationKind.QUOTATION_DECLINED),
                        eq(Audience.staff(yen)),
                        eq(Subject.request(request)),
                        anyString(),
                        anyString());
    }

    @Test
    void aReasonIsOptionalWhenDeclining() {
        customer().decline(bookings, request.getId(), new DeclineRequest("   "));

        assertThat(q.getStatus()).isEqualTo(QuotationStatus.DECLINED);
        assertThat(q.getDeclineReason()).isNull();
    }

    @Test
    void anExpiredQuotationCantBeDeclined() {
        assertThatThrownBy(() -> at(AFTER_EXPIRY).decline(bookings, request.getId(), null))
                .extracting("code")
                .isEqualTo("QUOTATION_EXPIRED");
        assertNothingWritten();
    }

    @Test
    void everyActiveManagerIsToldWhenNobodyPreparedIt() {
        q.setPreparedBy(null);

        customer().accept(bookings, request.getId());

        verify(notifications)
                .notify(
                        eq(NotificationKind.QUOTATION_ACCEPTED),
                        eq(Audience.role(RoleName.LOGISTICS_MANAGER)),
                        eq(Subject.request(request)),
                        anyString(),
                        anyString());
    }

    void assertNothingWritten() {
        verify(quotations, never()).saveAndFlush(any());
        verify(requests, never()).save(any());
        verify(audit, never())
                .recordDecision(any(), anyString(), anyString(), anyString(), any(), any(), any(), any(), any());
        verifyNoInteractions(notifications);
    }
}
