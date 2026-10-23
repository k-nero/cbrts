package com.equifreight.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.AuditService;
import com.equifreight.service.NotificationService;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** BR-F1-03, Flow 1 A4: a quotation is reminded a day before it expires, then expires with its request. */
class QuotationExpiryJobTest {

    static final Instant NOW = Instant.parse("2026-10-27T17:30:00Z");

    QuotationRepository quotations;
    TransportRequestRepository requests;
    NotificationService notifications;
    AuditService audit;
    EntityManager entities;
    QuotationExpiryJob job;
    List<Quotation> issued = new ArrayList<>();
    TransportRequest request;

    @BeforeEach
    void setUp() {
        quotations = mock(QuotationRepository.class);
        requests = mock(TransportRequestRepository.class);
        notifications = mock(NotificationService.class);
        audit = mock(AuditService.class);
        entities = mock(EntityManager.class);
        job = new QuotationExpiryJob(
                quotations, requests, notifications, audit, entities, Clock.fixed(NOW, BusinessTime.ZONE));
        Club club = new Club();
        club.setId(UUID.randomUUID());
        request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0199");
        request.setClub(club);
        request.setStatus(RequestStatus.QUOTED);
        when(quotations.findByStatusAndValidUntilBefore(eq(QuotationStatus.ISSUED), any()))
                .thenAnswer(i -> issued.stream()
                        .filter(q -> q.getStatus() == QuotationStatus.ISSUED
                                && q.getValidUntil().isBefore(i.getArgument(1)))
                        .toList());
        when(quotations.findByStatusAndReminderSentAtIsNullAndValidUntilBefore(eq(QuotationStatus.ISSUED), any()))
                .thenAnswer(i -> issued.stream()
                        .filter(q -> q.getStatus() == QuotationStatus.ISSUED
                                && q.getReminderSentAt() == null
                                && q.getValidUntil().isBefore(i.getArgument(1)))
                        .toList());
    }

    Quotation issuedUntil(Instant validUntil) {
        Quotation q = new Quotation();
        q.setId(UUID.randomUUID());
        q.setCode("Q-2026-0189");
        q.setVersionNo((short) 1);
        q.setStatus(QuotationStatus.ISSUED);
        q.setRequest(request);
        q.setValidUntil(validUntil);
        User yen = new User();
        yen.setFirstName("Thị Yến");
        yen.setLastName("Vũ");
        q.setPreparedBy(yen);
        issued.add(q);
        return q;
    }

    @Test
    void anOverdueQuotationExpiresWithItsRequest() {
        Quotation q = issuedUntil(Instant.parse("2026-10-27T16:59:59.999Z"));

        job.run();

        assertThat(q.getStatus()).isEqualTo(QuotationStatus.EXPIRED);
        assertThat(request.getStatus()).isEqualTo(RequestStatus.EXPIRED);
        verify(audit)
                .recordSystem(
                        "QUOTATION_EXPIRED",
                        "Quotation Q-2026-0189 v1 expired on 27 Oct 2026",
                        "TRANSPORT_REQUEST",
                        request.getId(),
                        "REQ-2026-0199",
                        "{\"status\":\"QUOTED\"}",
                        "{\"status\":\"EXPIRED\"}");
        verify(notifications)
                .notify(
                        NotificationKind.QUOTATION_EXPIRED,
                        Audience.club(request.getClub().getId()),
                        Subject.quotation(q),
                        "Quotation Q-2026-0189 has expired",
                        "Vũ Thị Yến can re-price it from the rate catalog in force now.");
        verify(notifications, never())
                .notify(eq(NotificationKind.QUOTATION_EXPIRING), any(), any(), anyString(), any());
    }

    @Test
    void aRequestNoLongerQuotedKeepsItsStatus() {
        request.setStatus(RequestStatus.CANCELLED);
        Quotation q = issuedUntil(NOW.minus(Duration.ofHours(1)));

        job.run();

        assertThat(q.getStatus()).isEqualTo(QuotationStatus.EXPIRED);
        assertThat(request.getStatus()).isEqualTo(RequestStatus.CANCELLED);
        verifyNoInteractions(notifications);
    }

    @Test
    void aCancelledRequestsQuotationIsNotReminded() {
        request.setStatus(RequestStatus.CANCELLED);
        Quotation q = issuedUntil(NOW.plus(Duration.ofHours(20)));

        job.run();

        assertThat(q.getReminderSentAt()).isNull();
        verifyNoInteractions(notifications);
    }

    @Test
    void theReminderIsSentOnceInsideTwentyFourHours() {
        Quotation q = issuedUntil(NOW.plus(Duration.ofHours(20)));

        job.run();
        job.run();

        assertThat(q.getStatus()).isEqualTo(QuotationStatus.ISSUED);
        assertThat(q.getReminderSentAt()).isEqualTo(NOW);
        verify(notifications)
                .notify(
                        NotificationKind.QUOTATION_EXPIRING,
                        Audience.club(request.getClub().getId()),
                        Subject.quotation(q),
                        "Quotation Q-2026-0189 v1 expires within a day",
                        "It holds its price until 28 Oct 2026.");
    }

    @Test
    void aQuotationMoreThanADayOutIsNotReminded() {
        Quotation q = issuedUntil(NOW.plus(Duration.ofHours(30)));

        job.run();

        assertThat(q.getReminderSentAt()).isNull();
        verifyNoInteractions(notifications);
    }

    @Test
    void aQuotationValidUntilNowIsNotYetExpired() {
        Quotation q = issuedUntil(NOW);

        job.run();

        assertThat(q.getStatus()).isEqualTo(QuotationStatus.ISSUED);
        assertThat(request.getStatus()).isEqualTo(RequestStatus.QUOTED);
    }

    @Test
    void onlyIssuedQuotationsAreRead() {
        job.run();

        verify(quotations).findByStatusAndValidUntilBefore(QuotationStatus.ISSUED, NOW);
        verify(quotations)
                .findByStatusAndReminderSentAtIsNullAndValidUntilBefore(
                        QuotationStatus.ISSUED, NOW.plus(Duration.ofHours(24)));
    }

    @Test
    void aQuotationSupersededWhileTheJobRanIsLeftAsItIs() {
        Quotation q = issuedUntil(NOW.minus(Duration.ofHours(1)));
        // A manager issued v2 between the job's read and its lock: the refreshed row is SUPERSEDED.
        doAnswer(i -> {
                    q.setStatus(QuotationStatus.SUPERSEDED);
                    q.setSupersededReason("Departure moved from 12 Nov to 20 Nov.");
                    return null;
                })
                .when(entities)
                .refresh(q);

        job.run();

        verify(entities).refresh(request, LockModeType.PESSIMISTIC_WRITE);
        assertThat(q.getStatus()).isEqualTo(QuotationStatus.SUPERSEDED);
        assertThat(q.getSupersededReason()).isEqualTo("Departure moved from 12 Nov to 20 Nov.");
        assertThat(request.getStatus()).isEqualTo(RequestStatus.QUOTED);
        verify(quotations, never()).save(q);
        verifyNoInteractions(notifications);
    }
}
