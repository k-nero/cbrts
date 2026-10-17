package com.equifreight.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
    @Transactional
    public void returnForInformation(User manager, UUID id, String rawNote) {
        String note = rawNote == null ? "" : rawNote.trim();
        if (note.isEmpty()) {
            throw new BusinessException("NOTE_REQUIRED", "Write a note to the customer: say what is missing.");
        }
        if (note.length() > NOTE_MAX) {
            throw new BusinessException("NOTE_TOO_LONG",
                    "The note is " + note.length() + " characters; keep it to " + NOTE_MAX + ".");
        }
        TransportRequest request = requests.findByIdForUpdate(id)
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
    }

    /** audit_log.summary is varchar(500): a longer line ends in "…". */
    private static String fit(String summary) {
        return summary.length() <= AUDIT_SUMMARY_MAX ? summary : summary.substring(0, AUDIT_SUMMARY_MAX - 1) + "…";
    }
}
