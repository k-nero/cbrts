package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.AuditLog;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.model.request.LeadTimeResponse;
import com.equifreight.model.request.NextStepResponse;
import com.equifreight.model.review.HistoryEntryResponse;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.TransportJobRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** US-F1-08: the customer follows where a request stands, what happened to it and what is expected next. */
class RequestProgressServiceTest {

    /** 18 Oct 2026, 09:00 in Ho Chi Minh City. */
    private static final Instant NOW = Instant.parse("2026-10-18T02:00:00Z");

    private final AuditLogRepository auditLogs = mock(AuditLogRepository.class);
    private final QuotationRepository quotations = mock(QuotationRepository.class);
    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private RequestProgressService service;
    private TransportRequest request;
    private User yen;

    @BeforeEach
    void setUp() {
        service = new RequestProgressService(
                auditLogs, quotations, jobs, JsonMapper.builder().build(), Clock.fixed(NOW, BusinessTime.ZONE));
        request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0042");
        yen = user("Yến", "Vũ Hải");
        when(auditLogs.findByEntityTypeAndEntityIdOrderByOccurredAtDesc("TRANSPORT_REQUEST", request.getId()))
                .thenReturn(List.of());
    }

    private static User user(String first, String last) {
        User u = new User();
        u.setFirstName(first);
        u.setLastName(last);
        return u;
    }

    private static AuditLog row(String action, String summary, String actor, String before, String after) {
        AuditLog log = new AuditLog();
        log.setOccurredAt(NOW);
        log.setAction(action);
        log.setSummary(summary);
        log.setActorLabel(actor);
        log.setBefore(before == null ? null : "{\"status\":\"" + before + "\"}");
        log.setAfter(after == null ? null : "{\"status\":\"" + after + "\"}");
        return log;
    }

    private Quotation quotation(QuotationStatus status) {
        Quotation q = new Quotation();
        q.setCode("Q-2026-0004");
        q.setVersionNo((short) 2);
        q.setStatus(status);
        q.setPreparedBy(yen);
        q.setValidUntil(Instant.parse("2026-10-24T16:59:59Z"));
        return q;
    }

    private NextStepResponse next(RequestStatus status) {
        request.setStatus(status);
        return service.of(request, null).nextStep();
    }

    @Test
    @DisplayName("History lists every status change, and leaves out work that doesn't move the request")
    void historyIsStatusChanges() {
        when(auditLogs.findByEntityTypeAndEntityIdOrderByOccurredAtDesc("TRANSPORT_REQUEST", request.getId()))
                .thenReturn(List.of(
                        row(
                                "QUOTATION_ISSUED",
                                "Quotation Q-2026-0004 v1 issued",
                                "Vũ Hải Yến",
                                "UNDER_REVIEW",
                                "QUOTED"),
                        row("QUOTATION_REPRICED", "Re-priced on rate catalog v3", "Vũ Hải Yến", null, null),
                        row(
                                "QUOTATION_STARTED",
                                "Quotation Q-2026-0004 v1 started on rate catalog v3; the request is under review",
                                "Vũ Hải Yến",
                                "SUBMITTED",
                                "UNDER_REVIEW"),
                        row("LEAD_TIME_CHECKED", "Lead time checked", "System", null, null),
                        row(
                                "REQUEST_SUBMITTED",
                                "Submitted with 1 horse: Shadowfax.",
                                "Saigon Turf Club",
                                "DRAFT",
                                "SUBMITTED")));
        request.setStatus(RequestStatus.QUOTED);

        List<HistoryEntryResponse> history = service.of(request, null).history();

        assertThat(history)
                .extracting(HistoryEntryResponse::getSummary)
                .containsExactly(
                        "Quotation Q-2026-0004 v1 issued",
                        "Under review: the logistics manager is preparing your quotation.",
                        "Submitted with 1 horse: Shadowfax.");
        assertThat(history)
                .extracting(HistoryEntryResponse::getActorLabel)
                .containsExactly("Vũ Hải Yến", "Vũ Hải Yến", "Saigon Turf Club");
    }

    @Test
    @DisplayName("A quotation that expires on a cancelled request isn't a step of the customer's request")
    void expiryAfterCancellingIsLeftOut() {
        when(auditLogs.findByEntityTypeAndEntityIdOrderByOccurredAtDesc("TRANSPORT_REQUEST", request.getId()))
                .thenReturn(List.of(row("QUOTATION_EXPIRED", "Expired", "System", "CANCELLED", "CANCELLED")));
        request.setStatus(RequestStatus.CANCELLED);

        assertThat(service.of(request, null).history()).isEmpty();
    }

    @Test
    @DisplayName("Before anyone picks it up, a submitted request waits on any logistics manager")
    void submittedWaitsOnTheRole() {
        when(quotations.findFirstByRequestIdOrderByVersionNoDesc(request.getId()))
                .thenReturn(Optional.empty());

        NextStepResponse step = next(RequestStatus.SUBMITTED);

        assertThat(step.owner()).isEqualTo("A logistics manager");
        assertThat(step.yours()).isFalse();
        assertThat(step.action()).isEqualTo("Check the route, dates and capacity, then prepare your quotation");
        assertThat(step.due()).isNull();
    }

    @Test
    @DisplayName("Under review, the manager preparing the quotation owns the next step, by name")
    void underReviewNamesTheManager() {
        when(quotations.findFirstByRequestIdOrderByVersionNoDesc(request.getId()))
                .thenReturn(Optional.of(quotation(QuotationStatus.DRAFT)));

        NextStepResponse step = next(RequestStatus.UNDER_REVIEW);

        assertThat(step.owner()).isEqualTo("Vũ Hải Yến, logistics manager");
        assertThat(step.action()).isEqualTo("Prepare your itemised quotation");
    }

    @Test
    @DisplayName("Returned for information, the customer answers by the last day the lead time still holds")
    void infoRequiredIsYoursUntilTheLeadTimeRunsOut() {
        request.setStatus(RequestStatus.INFO_REQUIRED);
        request.setDepartureDate(LocalDate.of(2026, 11, 20));
        // 21 days' notice with dates that can move by 2: the earliest departure is 18 Oct + 23 days.
        LeadTimeResponse leadTime =
                LeadTimePolicy.assess(21, 2, LocalDate.of(2026, 10, 18), request.getDepartureDate());

        NextStepResponse step = service.of(request, leadTime).nextStep();

        assertThat(step.yours()).isTrue();
        assertThat(step.owner()).isEqualTo("You");
        assertThat(step.due()).isEqualTo(LocalDate.of(2026, 10, 28));
    }

    @Test
    @DisplayName("A quoted request waits on the customer until the quotation's last valid day")
    void quotedIsYoursUntilItExpires() {
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(quotation(QuotationStatus.ISSUED)));

        NextStepResponse step = next(RequestStatus.QUOTED);

        assertThat(step.action()).isEqualTo("Accept or decline quotation Q-2026-0004 v2");
        assertThat(step.yours()).isTrue();
        assertThat(step.due()).isEqualTo(LocalDate.of(2026, 10, 24));
    }

    @Test
    @DisplayName("Accepted, the logistics manager approves it into a job")
    void acceptedWaitsOnApproval() {
        when(quotations.findFirstByRequestIdOrderByVersionNoDesc(request.getId()))
                .thenReturn(Optional.of(quotation(QuotationStatus.ACCEPTED)));

        NextStepResponse step = next(RequestStatus.CUSTOMER_ACCEPTED);

        assertThat(step.action()).isEqualTo("Approve the move into a transport job and name its team");
        assertThat(step.owner()).isEqualTo("Vũ Hải Yến, logistics manager");
    }

    @Test
    @DisplayName("An expired quotation waits for the customer's re-quote (A4); a declined one has no next step")
    void expiredOrDeclined() {
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(quotation(QuotationStatus.EXPIRED)));
        NextStepResponse step = next(RequestStatus.EXPIRED);
        assertThat(step.action()).isEqualTo("Ask for a re-quote of quotation Q-2026-0004 v2");
        assertThat(step.yours()).isTrue();

        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(quotation(QuotationStatus.DECLINED)));
        assertThat(next(RequestStatus.EXPIRED)).isNull();
    }

    private Quotation draft(short versionNo, User by) {
        Quotation d = quotation(QuotationStatus.DRAFT);
        d.setVersionNo(versionNo);
        d.setPreparedBy(by);
        return d;
    }

    @Test
    @DisplayName("Expired with the next version drafted (a re-quote, A4): its manager issues it")
    void expiredWithADraftNamesTheIssue() {
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(quotation(QuotationStatus.EXPIRED)));
        when(quotations.findFirstByRequestIdOrderByVersionNoDesc(request.getId()))
                .thenReturn(Optional.of(draft((short) 3, user("Lan", "Nguyễn Thị"))));

        NextStepResponse step = next(RequestStatus.EXPIRED);

        assertThat(step.action()).isEqualTo("Issue version 3 of the quotation");
        assertThat(step.owner()).isEqualTo("Nguyễn Thị Lan, logistics manager");
        assertThat(step.yours()).isFalse();
    }

    @Test
    @DisplayName("Declined, a leftover draft doesn't bring the next step back: a decline is final")
    void expiredWithADraftAfterADeclineHasNoNextStep() {
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(quotation(QuotationStatus.DECLINED)));
        when(quotations.findFirstByRequestIdOrderByVersionNoDesc(request.getId()))
                .thenReturn(Optional.of(draft((short) 3, yen)));

        assertThat(next(RequestStatus.EXPIRED)).isNull();
    }

    @Test
    @DisplayName("Expired with no draft, the customer asks for a re-quote by the day before departure")
    void expiredWithoutADraftIsTheCustomersReQuote() {
        Quotation expired = quotation(QuotationStatus.EXPIRED);
        request.setDepartureDate(LocalDate.of(2026, 11, 20));
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(expired));
        when(quotations.findFirstByRequestIdOrderByVersionNoDesc(request.getId()))
                .thenReturn(Optional.of(expired));

        NextStepResponse step = next(RequestStatus.EXPIRED);

        assertThat(step.action()).isEqualTo("Ask for a re-quote of quotation Q-2026-0004 v2");
        assertThat(step.owner()).isEqualTo("You");
        assertThat(step.yours()).isTrue();
        assertThat(step.due()).isEqualTo(LocalDate.of(2026, 11, 19));
    }

    @Test
    @DisplayName("Expired with the departure today or past, nothing more happens: a re-quote is refused")
    void expiredAfterTheDepartureHasNoNextStep() {
        Quotation expired = quotation(QuotationStatus.EXPIRED);
        when(quotations.findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(request.getId(), QuotationStatus.DRAFT))
                .thenReturn(Optional.of(expired));
        when(quotations.findFirstByRequestIdOrderByVersionNoDesc(request.getId()))
                .thenReturn(Optional.of(expired));

        // 18 Oct 2026 is today in Ho Chi Minh City.
        request.setDepartureDate(LocalDate.of(2026, 10, 18));
        assertThat(next(RequestStatus.EXPIRED)).isNull();

        request.setDepartureDate(LocalDate.of(2026, 10, 19));
        assertThat(next(RequestStatus.EXPIRED)).isNotNull();
    }

    @Test
    @DisplayName("Approved, the customer sends the documents and the job's transport specialist checks them")
    void approvedSendsDocuments() {
        TransportJob job = new TransportJob();
        job.setCode("CBRT-2026-041");
        job.setTransportSpecialist(user("Lan", "Trần Thị"));
        when(jobs.findByRequestId(request.getId())).thenReturn(Optional.of(job));

        NextStepResponse step = next(RequestStatus.APPROVED);

        assertThat(step.yours()).isTrue();
        assertThat(step.action())
                .isEqualTo("Send the documents on the checklist for job CBRT-2026-041; Trần Thị Lan, transport"
                        + " specialist, checks each one");
    }

    @Test
    @DisplayName("Nothing comes next once a request is rejected or cancelled")
    void closedRequestsHaveNoNextStep() {
        assertThat(next(RequestStatus.REJECTED)).isNull();
        assertThat(next(RequestStatus.CANCELLED)).isNull();
    }
}
