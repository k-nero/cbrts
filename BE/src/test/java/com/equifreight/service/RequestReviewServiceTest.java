package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.AuditLog;
import com.equifreight.entity.Club;
import com.equifreight.entity.RequestRevision;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.review.QueueRowResponse;
import com.equifreight.model.review.RequestReviewResponse;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.RequestRevisionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
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
        when(routes.resolve(any(), any(), any(), any(), any())).thenReturn(RouteResolution.none());
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

    // --- the queue and the review view (US-F1-03) ---------------------------------------------------------

    @Test
    void theQueueMapsRows() {
        Instant older = Instant.parse("2026-09-25T02:00:00Z");
        Instant newer = Instant.parse("2026-09-27T02:00:00Z");
        when(requests.findQueue(any(), any())).thenReturn(new PageImpl<>(List.of(
                row("REQ-2026-0190", "Hanoi Riding Club", older, 2),
                row("REQ-2026-0193", "Saigon Turf Club", newer, 1))));

        Page<QueueRowResponse> page = service.queue(PageRequest.of(0, 20));

        assertThat(page.getContent()).extracting(QueueRowResponse::getCode)
                .containsExactly("REQ-2026-0190", "REQ-2026-0193");
        QueueRowResponse first = page.getContent().getFirst();
        assertThat(first.getClub()).isEqualTo("Hanoi Riding Club");
        assertThat(first.getHorseCount()).isEqualTo(2);
        assertThat(first.getWaitingSince()).isEqualTo(older);
        assertThat(first.getRevisionNo()).isEqualTo((short) 2);
        assertThat(first.getDateFlexDays()).isEqualTo(3);
    }

    @Test
    void theViewHasChecksRevisionsHistoryAndPosition() {
        TransportRequest r = inReview(RequestStatus.SUBMITTED);
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(requests.findQueueIds(any())).thenReturn(List.of(a, r.getId(), b));
        RequestRevision v1 = revision(r, 1, "Which stable?");
        v1.setPayload("{\"code\":\"REQ-2026-0193\",\"departureDate\":\"2026-10-30\"}");
        RequestRevision v2 = revision(r, 2, null);
        v2.setPayload("{\"code\":\"REQ-2026-0193\",\"departureDate\":\"2026-11-02\"}");
        when(revisions.findByRequestIdOrderByRevisionNoAsc(r.getId())).thenReturn(List.of(v1, v2));
        AuditLog submitted = audit("Submitted with 1 horse: Shadowfax.", "Saigon Turf Club");
        when(auditLogs.findByEntityTypeAndEntityIdOrderByOccurredAtDesc("TRANSPORT_REQUEST", r.getId()))
                .thenReturn(List.of(submitted));

        RequestReviewResponse view = service.view(r.getId());

        assertThat(view.getQueue().getPosition()).isEqualTo(2);
        assertThat(view.getQueue().getTotal()).isEqualTo(3);
        assertThat(view.getQueue().getPreviousId()).isEqualTo(a);
        assertThat(view.getQueue().getNextId()).isEqualTo(b);
        assertThat(view.getRevisions()).hasSize(2);
        assertThat(view.getRevisions().getFirst().getNote()).isEqualTo("Which stable?");
        assertThat(view.getRevisions().get(1).getPayload().get("departureDate").asString()).isEqualTo("2026-11-02");
        assertThat(view.getHistory()).singleElement().satisfies(h -> {
            assertThat(h.getSummary()).isEqualTo("Submitted with 1 horse: Shadowfax.");
            assertThat(h.getActorLabel()).isEqualTo("Saigon Turf Club");
        });
        assertThat(view.getChecks()).extracting("key").containsExactly("ROUTE_SERVED", "LEAD_TIME");
        assertThat(view.getRequest().getClub()).isEqualTo("Saigon Turf Club");
    }

    @Test
    void aRequestOutOfTheQueueHasNoPosition() {
        TransportRequest r = inReview(RequestStatus.INFO_REQUIRED);

        assertThat(service.view(r.getId()).getQueue()).isNull();
    }

    @Test
    void anUnknownRequestHasNoView() {
        UUID unknown = UUID.randomUUID();
        when(requests.findById(unknown)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.view(unknown)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void returningAnswersTheView() {
        TransportRequest r = inReview(RequestStatus.SUBMITTED);

        RequestReviewResponse view = service.returnForInformation(manager, r.getId(), NOTE);

        assertThat(view.getRequest().getStatus()).isEqualTo(RequestStatus.INFO_REQUIRED);
        assertThat(view.getQueue()).isNull();
    }

    @Test
    void anOldPayloadPassesThrough() {
        TransportRequest r = inReview(RequestStatus.SUBMITTED);
        RequestRevision v1 = revision(r, 1, null);
        v1.setPayload("{\"id\":\"x\",\"code\":\"REQ-2026-0195\",\"horses\":[]}");
        when(revisions.findByRequestIdOrderByRevisionNoAsc(r.getId())).thenReturn(List.of(v1));

        RequestReviewResponse view = service.view(r.getId());

        assertThat(view.getRevisions().getFirst().getPayload().get("code").asString()).isEqualTo("REQ-2026-0195");
    }

    // --- helpers ------------------------------------------------------------------------------------------

    static TransportRequestRepository.QueueRow row(String code, String club, Instant waitingSince, int revisionNo) {
        return new TransportRequestRepository.QueueRow() {
            public UUID getId() { return UUID.randomUUID(); }
            public String getCode() { return code; }
            public String getClub() { return club; }
            public String getFromCity() { return "Ho Chi Minh City"; }
            public String getToCity() { return "Bangkok"; }
            public TransportMode getMode() { return TransportMode.ROAD; }
            public Number getHorseCount() { return 2L; }
            public LocalDate getDepartureDate() { return LocalDate.of(2026, 10, 30); }
            public Number getDateFlexDays() { return (short) 3; }
            public Instant getWaitingSince() { return waitingSince; }
            public Number getRevisionNo() { return (short) revisionNo; }
        };
    }

    static AuditLog audit(String summary, String actorLabel) {
        AuditLog log = new AuditLog();
        log.setOccurredAt(Instant.parse("2026-09-26T02:14:00Z"));
        log.setSummary(summary);
        log.setActorLabel(actorLabel);
        return log;
    }

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
