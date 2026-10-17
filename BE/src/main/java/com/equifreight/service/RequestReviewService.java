package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.AuditLog;
import com.equifreight.entity.RequestRevision;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
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
import com.equifreight.repository.RequestRevisionRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The logistics manager's side of Flow 1 before pricing (US-F1-03, US-F1-04): the queue of requests waiting
 * for review, the review view, and returning a request to the customer with a note. Every decision writes
 * an audit row in the same transaction (BR-F1-08).
 */
@Service
public class RequestReviewService {

    /** request_revisions.note is varchar(500); transport_requests.info_required_note holds 1000. */
    static final int NOTE_MAX = 500;
    private static final String ENTITY_TYPE = "TRANSPORT_REQUEST";
    /** Leading and trailing white space as the browser's trim() sees it, NBSP and BOM included. */
    private static final Pattern EDGE_SPACE = Pattern.compile("^[\\s\\p{Z}\\x{FEFF}]+|[\\s\\p{Z}\\x{FEFF}]+$");
    private static final int AUDIT_SUMMARY_MAX = 500;
    private static final List<RequestStatus> IN_REVIEW = List.of(RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW);
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
    private final UserRepository users;
    private final AuditLogRepository auditLogs;
    private final RouteService routes;
    private final AuditService audit;
    private final NotificationService notifications;
    private final JsonMapper json;
    private final Clock clock;

    public RequestReviewService(TransportRequestRepository requests, RequestRevisionRepository revisions,
                                UserRepository users, AuditLogRepository auditLogs, RouteService routes,
                                AuditService audit, NotificationService notifications, JsonMapper json,
                                Clock clock) {
        this.requests = requests;
        this.revisions = revisions;
        this.users = users;
        this.auditLogs = auditLogs;
        this.routes = routes;
        this.audit = audit;
        this.notifications = notifications;
        this.json = json;
        this.clock = clock;
    }

    /**
     * R-F1-04: the request goes back to its club with the note, which is kept on the request and on the
     * version it was about, so both versions stay readable after the customer sends the next one.
     */
    /** US-F1-03: the requests waiting for review, oldest first, 20 to a page. */
    @Transactional(readOnly = true)
    public Page<QueueRowResponse> queue(Pageable pageable) {
        return requests.findQueue(IN_REVIEW, pageable).map(row -> QueueRowResponse.builder()
                .id(row.getId())
                .code(row.getCode())
                .club(row.getClub())
                .fromCity(row.getFromCity())
                .toCity(row.getToCity())
                .mode(row.getMode())
                .horseCount(row.getHorseCount() == null ? 0 : row.getHorseCount().longValue())
                .departureDate(row.getDepartureDate())
                .dateFlexDays(row.getDateFlexDays() == null ? 0 : row.getDateFlexDays().intValue())
                .waitingSince(row.getWaitingSince())
                .revisionNo(row.getRevisionNo() == null ? 1 : row.getRevisionNo().shortValue())
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
        List<Instant> returns = auditLogs.findByEntityTypeAndEntityIdAndActionOrderByOccurredAtAsc(ENTITY_TYPE,
                request.getId(), RequestService.INFO_REQUIRED_ACTION).stream().map(AuditLog::getOccurredAt).toList();
        Map<Short, Instant> returned = RevisionDates.returnedAt(all, returns);

        RouteResponse stored = request.getCorridor() == null || request.getOriginPlace() == null ? null
                : routes.describe(request.getCorridor(), request.getOriginPlace(), request.getDestinationPlace());
        List<RevisionSummaryResponse> summaries = all.stream().map(v -> RevisionSummaryResponse.builder()
                .revisionNo(v.getRevisionNo()).submittedAt(v.getSubmittedAt()).note(v.getNote())
                .returnedAt(returned.get(v.getRevisionNo())).build()).toList();
        RequestResponse response = RequestMapper.toResponse(request, stored, null, List.of(), summaries)
                .toBuilder().club(request.getClub().getName()).build();

        return RequestReviewResponse.builder()
                .request(response)
                .checks(checks(request, all))
                .revisions(all.stream().map(v -> RevisionResponse.builder()
                        .revisionNo(v.getRevisionNo())
                        .submittedAt(v.getSubmittedAt())
                        .note(v.getNote())
                        .returnedAt(returned.get(v.getRevisionNo()))
                        .payload(json.readTree(v.getPayload()))
                        .build()).toList())
                .history(auditLogs.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(ENTITY_TYPE, request.getId())
                        .stream().map(a -> HistoryEntryResponse.builder().occurredAt(a.getOccurredAt())
                                .summary(a.getSummary()).actorLabel(a.getActorLabel()).build()).toList())
                .queue(position(request))
                .build();
    }

    /** Route served and lead time, worked out now, against the latest submission (spec §4.4). */
    private List<CheckResponse> checks(TransportRequest request, List<RequestRevision> all) {
        RouteResponse current = routes.resolve(request.getOriginPlace(), request.getOriginText(),
                request.getDestinationPlace(), request.getDestinationText(), request.getMode()).route();
        Instant lastSubmitted = all.isEmpty() ? request.getSubmittedAt() : all.getLast().getSubmittedAt();
        LocalDate today = LocalDate.ofInstant(clock.instant(), BusinessTime.ZONE);
        CheckResponse lead = lastSubmitted == null || request.getDepartureDate() == null
                ? ReviewChecks.leadTime(null, today, today, today)
                : ReviewChecks.leadTime(current, ReviewChecks.submittedDay(lastSubmitted), request.getDepartureDate(),
                today);
        return List.of(ReviewChecks.routeServed(current), lead);
    }

    private QueuePositionResponse position(TransportRequest request) {
        if (!IN_REVIEW.contains(request.getStatus())) {
            return null;
        }
        List<UUID> ids = requests.findQueueIds(IN_REVIEW);
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

    @Transactional
    public RequestReviewResponse returnForInformation(User manager, UUID id, String rawNote) {
        String note = rawNote == null ? "" : EDGE_SPACE.matcher(rawNote).replaceAll("");
        if (note.isEmpty()) {
            throw new BusinessException("NOTE_REQUIRED", "Write a note to the customer: say what is missing.");
        }
        if (note.length() > NOTE_MAX) {
            throw new BusinessException("NOTE_TOO_LONG",
                    "The note is " + note.length() + " characters; keep it to " + NOTE_MAX + ".");
        }
        // A draft stays the club's own until it is sent.
        TransportRequest request = requests.findByIdForUpdate(id)
                .filter(r -> r.getStatus() != RequestStatus.DRAFT)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", id));
        RequestStatus before = request.getStatus();
        if (!IN_REVIEW.contains(before)) {
            throw new ConflictException("REQUEST_NOT_IN_REVIEW",
                    "This request isn't waiting for review; it is " + STATUS_WORDS.get(before) + ".");
        }

        request.setStatus(RequestStatus.INFO_REQUIRED);
        request.setInfoRequiredNote(note);
        requests.save(request);
        List<RequestRevision> all = revisions.findByRequestIdOrderByRevisionNoAsc(request.getId());
        if (!all.isEmpty()) {
            RequestRevision latest = all.getLast();
            latest.setNote(note);
            revisions.save(latest);
        }

        audit.recordDecision(manager, RequestService.INFO_REQUIRED_ACTION, fit("Returned with a note: " + note),
                ENTITY_TYPE, request.getId(), request.getCode(), note, "{\"status\":\"" + before + "\"}",
                "{\"status\":\"INFO_REQUIRED\"}");
        for (User account : users.findByClubId(request.getClub().getId())) {
            notifications.sendNotification(account, RequestService.INFO_REQUIRED_ACTION,
                    request.getCode() + " needs your answer", note, ENTITY_TYPE, request.getId());
        }
        return viewOf(request);
    }

    /** audit_log.summary is varchar(500): a longer line ends in "…". */
    private static String fit(String summary) {
        return summary.length() <= AUDIT_SUMMARY_MAX ? summary : summary.substring(0, AUDIT_SUMMARY_MAX - 1) + "…";
    }
}
