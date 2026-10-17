package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.RequestRevision;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.RequestRevisionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.equifreight.service.RequestServiceTest.revision;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** US-F1-03 and US-F1-04: the logistics manager's review queue and returning a request for information. */
class RequestReviewServiceTest {

    static final Instant NOW = Instant.parse("2026-09-28T02:41:00Z");
    static final String NOTE = "Shadowfax and Nightfall will be in Phnom Penh from 18 Oct. Should we collect them there?";

    TransportRequestRepository requests;
    RequestRevisionRepository revisions;
    UserRepository users;
    AuditLogRepository auditLogs;
    RouteService routes;
    AuditService audit;
    NotificationService notifications;
    RequestReviewService service;
    User manager;
    User clubAccount;
    Club club;

    @BeforeEach
    void setUp() {
        requests = mock(TransportRequestRepository.class);
        revisions = mock(RequestRevisionRepository.class);
        users = mock(UserRepository.class);
        auditLogs = mock(AuditLogRepository.class);
        routes = mock(RouteService.class);
        audit = mock(AuditService.class);
        notifications = mock(NotificationService.class);
        service = new RequestReviewService(requests, revisions, users, auditLogs, routes, audit, notifications,
                JsonMapper.builder().build(), Clock.fixed(NOW, BusinessTime.ZONE));

        manager = new User();
        manager.setId(UUID.randomUUID());
        club = new Club();
        club.setId(UUID.randomUUID());
        club.setName("Saigon Turf Club");
        clubAccount = new User();
        clubAccount.setId(UUID.randomUUID());
        clubAccount.setClub(club);
        when(users.findByClubId(club.getId())).thenReturn(List.of(clubAccount));
    }

    // --- returning a request for information (US-F1-04) ---------------------------------------------------

    @Test
    void aBlankNoteIsRefused() {
        TransportRequest r = inReview(RequestStatus.SUBMITTED);

        for (String note : new String[] {"   \n ", null}) {
            assertThatThrownBy(() -> service.returnForInformation(manager, r.getId(), note))
                    .isInstanceOf(BusinessException.class)
                    .hasMessage("Write a note to the customer: say what is missing.")
                    .extracting("code").isEqualTo("NOTE_REQUIRED");
        }
        verify(requests, never()).save(any());
        verifyNoInteractions(audit, notifications);
    }

    @Test
    void aNoteOf500CharactersIsAccepted() {
        TransportRequest r = inReview(RequestStatus.SUBMITTED);

        service.returnForInformation(manager, r.getId(), "  " + "x".repeat(500) + " ");

        assertThat(r.getInfoRequiredNote()).hasSize(500);
    }

    @Test
    void aNoteOver500IsRefused() {
        TransportRequest r = inReview(RequestStatus.SUBMITTED);

        assertThatThrownBy(() -> service.returnForInformation(manager, r.getId(), "x".repeat(501)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("The note is 501 characters; keep it to 500.")
                .extracting("code").isEqualTo("NOTE_TOO_LONG");
        assertThat(r.getStatus()).isEqualTo(RequestStatus.SUBMITTED);
    }

    @Test
    void onlyARequestInReviewCanBeReturned() {
        for (RequestStatus status : new RequestStatus[] {RequestStatus.DRAFT, RequestStatus.INFO_REQUIRED,
                RequestStatus.QUOTED}) {
            TransportRequest r = inReview(status);
            assertThatThrownBy(() -> service.returnForInformation(manager, r.getId(), NOTE))
                    .isInstanceOf(ConflictException.class)
                    .extracting("code").isEqualTo("REQUEST_NOT_IN_REVIEW");
        }
        TransportRequest waiting = inReview(RequestStatus.INFO_REQUIRED);
        assertThatThrownBy(() -> service.returnForInformation(manager, waiting.getId(), NOTE))
                .hasMessage("This request isn't waiting for review; it is waiting for the customer's answer.");
        verifyNoInteractions(audit, notifications);
    }

    @Test
    void anUnknownRequestAnswers404() {
        UUID unknown = UUID.randomUUID();
        when(requests.findByIdForUpdate(unknown)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.returnForInformation(manager, unknown, NOTE))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void returningWritesTheNoteEverywhere() {
        TransportRequest r = inReview(RequestStatus.SUBMITTED);
        RequestRevision v1 = revision(r, 1, null);
        when(revisions.findByRequestIdOrderByRevisionNoAsc(r.getId())).thenReturn(List.of(v1));

        service.returnForInformation(manager, r.getId(), NOTE);

        assertThat(r.getStatus()).isEqualTo(RequestStatus.INFO_REQUIRED);
        assertThat(r.getInfoRequiredNote()).isEqualTo(NOTE);
        assertThat(v1.getNote()).isEqualTo(NOTE);
        verify(revisions).save(v1);
        verify(requests).save(r);
        verify(audit).recordDecision(manager, "REQUEST_INFO_REQUIRED", "Returned with a note: " + NOTE,
                "TRANSPORT_REQUEST", r.getId(), "REQ-2026-0193", NOTE, "{\"status\":\"SUBMITTED\"}",
                "{\"status\":\"INFO_REQUIRED\"}");
        verify(notifications).sendNotification(clubAccount, "REQUEST_INFO_REQUIRED", "REQ-2026-0193 needs your answer",
                NOTE, "TRANSPORT_REQUEST", r.getId());
    }

    @Test
    void anUnderReviewRequestCanBeReturnedToo() {
        TransportRequest r = inReview(RequestStatus.UNDER_REVIEW);
        when(revisions.findByRequestIdOrderByRevisionNoAsc(r.getId())).thenReturn(List.of(revision(r, 1, null)));

        service.returnForInformation(manager, r.getId(), NOTE);

        verify(audit).recordDecision(manager, "REQUEST_INFO_REQUIRED", "Returned with a note: " + NOTE,
                "TRANSPORT_REQUEST", r.getId(), "REQ-2026-0193", NOTE, "{\"status\":\"UNDER_REVIEW\"}",
                "{\"status\":\"INFO_REQUIRED\"}");
    }

    @Test
    void aLongNoteIsCutToFitTheAuditSummary() {
        TransportRequest r = inReview(RequestStatus.SUBMITTED);
        String note = "y".repeat(500);

        service.returnForInformation(manager, r.getId(), note);

        verify(audit).recordDecision(any(), any(),
                org.mockito.ArgumentMatchers.argThat(s -> s.length() <= 500 && s.endsWith("…")),
                any(), any(), any(), any(), any(), any());
    }

    // --- helpers ------------------------------------------------------------------------------------------

    TransportRequest inReview(RequestStatus status) {
        TransportRequest r = new TransportRequest();
        r.setId(UUID.randomUUID());
        r.setClub(club);
        r.setStatus(status);
        if (status != RequestStatus.DRAFT) {
            r.setCode("REQ-2026-0193");
            r.setSubmittedAt(Instant.parse("2026-09-26T02:14:00Z"));
        }
        when(requests.findByIdForUpdate(r.getId())).thenReturn(Optional.of(r));
        when(requests.findById(r.getId())).thenReturn(Optional.of(r));
        return r;
    }
}
