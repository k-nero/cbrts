package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.AuditLog;
import com.equifreight.entity.RequestRevision;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.approval.ApprovalMapper;
import com.equifreight.model.quotation.QuotationMapper;
import com.equifreight.model.request.RequestMapper;
import com.equifreight.model.request.RequestResponse;
import com.equifreight.model.request.RevisionSummaryResponse;
import com.equifreight.model.review.CheckResponse;
import com.equifreight.model.review.HistoryEntryResponse;
import com.equifreight.model.review.QueuePositionResponse;
import com.equifreight.model.review.QueueRowResponse;
import com.equifreight.model.review.RequestReviewResponse;
import com.equifreight.model.review.RevisionResponse;
import com.equifreight.model.route.RouteResponse;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RequestRevisionRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/**
 * The logistics manager's side of Flow 1 before pricing (US-F1-03, US-F1-04): the queue of requests waiting
 * for review, the review view, and returning a request to the customer with a note. Every decision writes
 * an audit row in the same transaction (BR-F1-08).
 */
@Log4j2
@Service
public class RequestReviewService {

    /** request_revisions.note is varchar(500); transport_requests.info_required_note holds 1000. */
    static final int NOTE_MAX = 500;

    private static final String ENTITY_TYPE = "TRANSPORT_REQUEST";
    /** Leading and trailing white space as the browser's trim() sees it, NBSP and BOM included. */
    private static final Pattern EDGE_SPACE = Pattern.compile("^[\\s\\p{Z}\\x{FEFF}]+|[\\s\\p{Z}\\x{FEFF}]+$");

    private static final List<RequestStatus> IN_REVIEW = List.of(RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW);
    /** The queue: in review, or accepted and waiting for the manager's approval (US-F1-07). */
    private static final List<RequestStatus> QUEUE =
            List.of(RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW, RequestStatus.CUSTOMER_ACCEPTED);

    private static final Map<RequestStatus, String> STATUS_WORDS = Map.of(
            RequestStatus.DRAFT, "a draft",
            RequestStatus.INFO_REQUIRED, "waiting for the customer's answer",
            RequestStatus.QUOTED, "quoted",
            RequestStatus.CUSTOMER_ACCEPTED, "accepted by the customer",
            RequestStatus.APPROVED, "approved",
            RequestStatus.REJECTED, "rejected",
            RequestStatus.EXPIRED, "expired",
            RequestStatus.CANCELLED, "cancelled");

    private final TransportRequestRepository requests;
    private final RequestRevisionRepository revisions;
    private final AuditLogRepository auditLogs;
    private final RouteService routes;
    private final AuditService audit;
    private final NotificationService notifications;
    private final QuotationRepository quotations;
    private final TransportJobRepository jobs;
    private final JsonMapper json;
    private final Clock clock;

    public RequestReviewService(
            TransportRequestRepository requests,
            RequestRevisionRepository revisions,
            AuditLogRepository auditLogs,
            RouteService routes,
            AuditService audit,
            NotificationService notifications,
            QuotationRepository quotations,
            TransportJobRepository jobs,
            JsonMapper json,
            Clock clock) {
        this.requests = requests;
        this.revisions = revisions;
        this.auditLogs = auditLogs;
        this.routes = routes;
        this.audit = audit;
        this.notifications = notifications;
        this.quotations = quotations;
        this.jobs = jobs;
        this.json = json;
        this.clock = clock;
    }

    /** "accepted by the customer": a status in words, for refusals. */
    static String statusWords(RequestStatus status) {
        return STATUS_WORDS.getOrDefault(status, status.name().toLowerCase().replace('_', ' '));
    }

    /** US-F1-03: the requests waiting for review, oldest first, 20 to a page. */
    @Transactional(readOnly = true)
    public Page<QueueRowResponse> queue(Pageable pageable) {
        return requests.findQueue(QUEUE, pageable)
                .map(row -> QueueRowResponse.builder()
                        .id(row.getId())
                        .code(row.getCode())
                        .status(row.getStatus())
                        .club(row.getClub())
                        .fromCity(row.getFromCity())
                        .toCity(row.getToCity())
                        .mode(row.getMode())
                        .horseCount(
                                row.getHorseCount() == null
                                        ? 0
                                        : row.getHorseCount().longValue())
                        .departureDate(row.getDepartureDate())
                        .dateFlexDays(
                                row.getDateFlexDays() == null
                                        ? 0
                                        : row.getDateFlexDays().intValue())
                        .waitingSince(row.getWaitingSince())
                        .revisionNo(
                                row.getRevisionNo() == null
                                        ? 1
                                        : row.getRevisionNo().shortValue())
                        .build());
    }

    /** The Request review page: the request, its checks, every version, its history and its queue place. */
    @Transactional(readOnly = true)
    public RequestReviewResponse view(UUID id) {
        TransportRequest request = requests.findById(id)
                .filter(r -> r.getStatus() != RequestStatus.DRAFT)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", id));
        return viewOf(request);
    }

    private RequestReviewResponse viewOf(TransportRequest request) {
        List<RequestRevision> all = revisions.findByRequestIdOrderByRevisionNoAsc(request.getId());
        List<Instant> returns = auditLogs
                .findByEntityTypeAndEntityIdAndActionOrderByOccurredAtAsc(
                        ENTITY_TYPE, request.getId(), RequestService.INFO_REQUIRED_ACTION)
                .stream()
                .map(AuditLog::getOccurredAt)
                .toList();
        Map<Short, Instant> returned = RevisionDates.returnedAt(all, returns);

        RouteResponse stored = request.getCorridor() == null || request.getOriginPlace() == null
                ? null
                : routes.describe(request.getCorridor(), request.getOriginPlace(), request.getDestinationPlace());
        List<RevisionSummaryResponse> summaries = all.stream()
                .map(v -> RevisionSummaryResponse.builder()
                        .revisionNo(v.getRevisionNo())
                        .submittedAt(v.getSubmittedAt())
                        .note(v.getNote())
                        .returnedAt(returned.get(v.getRevisionNo()))
                        .build())
                .toList();
        RequestResponse response = RequestMapper.toResponse(request, stored, null, List.of(), summaries).toBuilder()
                .club(request.getClub().getName())
                .build();

        return RequestReviewResponse.builder()
                .request(response)
                .checks(checks(request, all))
                .revisions(all.stream()
                        .map(v -> RevisionResponse.builder()
                                .revisionNo(v.getRevisionNo())
                                .submittedAt(v.getSubmittedAt())
                                .note(v.getNote())
                                .returnedAt(returned.get(v.getRevisionNo()))
                                .payload(json.readTree(v.getPayload()))
                                .build())
                        .toList())
                .history(
                        auditLogs
                                .findByEntityTypeAndEntityIdOrderByOccurredAtDesc(ENTITY_TYPE, request.getId())
                                .stream()
                                .map(a -> HistoryEntryResponse.builder()
                                        .occurredAt(a.getOccurredAt())
                                        .summary(a.getSummary())
                                        .actorLabel(a.getActorLabel())
                                        .build())
                                .toList())
                .queue(position(request))
                .quotation(quotations
                        .findFirstByRequestIdOrderByVersionNoDesc(request.getId())
                        .map(QuotationMapper::toRef)
                        .orElse(null))
                .job(
                        request.getStatus() == RequestStatus.APPROVED
                                ? jobs.findByRequestId(request.getId())
                                        .map(ApprovalMapper::toJobRef)
                                        .orElse(null)
                                : null)
                .build();
    }

    /** Route served and lead time, worked out now, against the latest submission (spec §4.4). */
    private List<CheckResponse> checks(TransportRequest request, List<RequestRevision> all) {
        RouteResponse current = routes.resolve(
                        request.getOriginPlace(),
                        request.getOriginText(),
                        request.getDestinationPlace(),
                        request.getDestinationText(),
                        request.getMode())
                .route();
        Instant lastSubmitted =
                all.isEmpty() ? request.getSubmittedAt() : all.getLast().getSubmittedAt();
        LocalDate today = LocalDate.ofInstant(clock.instant(), BusinessTime.ZONE);
        CheckResponse lead = lastSubmitted == null || request.getDepartureDate() == null
                ? ReviewChecks.leadTime(null, today, today, today)
                : ReviewChecks.leadTime(
                        current, ReviewChecks.submittedDay(lastSubmitted), request.getDepartureDate(), today);
        return List.of(ReviewChecks.routeServed(current), lead);
    }

    private QueuePositionResponse position(TransportRequest request) {
        if (!QUEUE.contains(request.getStatus())) {
            return null;
        }
        List<UUID> ids = requests.findQueueIds(QUEUE);
        int at = ids.indexOf(request.getId());
        if (at < 0) {
            return null;
        }
        return QueuePositionResponse.builder()
                .position(at + 1)
                .total(ids.size())
                .previousId(at > 0 ? ids.get(at - 1) : null)
                .nextId(at < ids.size() - 1 ? ids.get(at + 1) : null)
                .build();
    }

    /**
     * R-F1-04: the request goes back to its club with the note, which is kept on the request and on the
     * version it was about, so both versions stay readable after the customer sends the next one.
     */
    @Transactional
    public RequestReviewResponse returnForInformation(User manager, UUID id, String rawNote) {
        String note = rawNote == null ? "" : EDGE_SPACE.matcher(rawNote).replaceAll("");
        if (note.isEmpty()) {
            throw new BusinessException("NOTE_REQUIRED", "Write a note to the customer: say what is missing.");
        }
        if (note.length() > NOTE_MAX) {
            throw new BusinessException(
                    "NOTE_TOO_LONG", "The note is " + note.length() + " characters; keep it to " + NOTE_MAX + ".");
        }
        // A draft stays the club's own until it is sent.
        TransportRequest request = requests.findByIdForUpdate(id)
                .filter(r -> r.getStatus() != RequestStatus.DRAFT)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", id));
        RequestStatus before = request.getStatus();
        if (!IN_REVIEW.contains(before)) {
            throw new ConflictException(
                    "REQUEST_NOT_IN_REVIEW",
                    "This request isn't waiting for review; it is " + STATUS_WORDS.get(before) + ".");
        }

        List<RequestRevision> all = revisions.findByRequestIdOrderByRevisionNoAsc(request.getId());
        if (all.isEmpty()) {
            // Every submission writes a version; without one the return couldn't keep its note with it.
            log.error("Request {} is {} but has no submitted version", request.getCode(), before);
            throw new ConflictException(
                    "REQUEST_HAS_NO_VERSION",
                    "This request has no submitted version to return. Ask an administrator to check it.");
        }

        request.setStatus(RequestStatus.INFO_REQUIRED);
        request.setInfoRequiredNote(note);
        requests.save(request);
        RequestRevision latest = all.getLast();
        latest.setNote(note);
        revisions.save(latest);

        audit.recordDecision(
                manager,
                RequestService.INFO_REQUIRED_ACTION,
                AuditText.fit("Returned with a note: " + note),
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                note,
                "{\"status\":\"" + before + "\"}",
                "{\"status\":\"INFO_REQUIRED\"}");
        notifications.notify(
                NotificationKind.REQUEST_INFO_REQUIRED,
                Audience.club(request.getClub().getId()),
                Subject.request(request),
                request.getCode() + " needs your answer",
                note);
        return viewOf(request);
    }
}
