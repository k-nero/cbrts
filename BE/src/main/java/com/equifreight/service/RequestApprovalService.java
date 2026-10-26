package com.equifreight.service;

import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.approval.ApprovalMapper;
import com.equifreight.model.approval.ApprovalOptionsResponse;
import com.equifreight.model.approval.ApproveRequest;
import com.equifreight.model.review.RequestReviewResponse;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TransportRequestRepository;
import com.equifreight.repository.UserJobCount;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The logistics manager's final decision on a request (US-F1-07, BR-F1-04 to 06): approving an accepted request
 * creates exactly one job with its CBRT code and its team, and hands it to Flow 2 with its document checklist; a
 * rejection ends the request with a reason the customer reads. Only the logistics manager reaches these, through
 * the controller's {@code @PreAuthorize}.
 */
@Service
public class RequestApprovalService {

    static final int REASON_MAX = 500;
    private static final String ENTITY_TYPE = "TRANSPORT_REQUEST";

    /** Every state from submission until the request is approved (BR-F1-04): a request can be turned down there. */
    private static final Set<RequestStatus> REJECTABLE = Set.of(
            RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW, RequestStatus.QUOTED, RequestStatus.CUSTOMER_ACCEPTED);

    private final TransportRequestRepository requests;
    private final QuotationRepository quotations;
    private final TransportJobRepository jobs;
    private final UserRepository users;
    private final TransportJobService jobService;
    private final ClearanceService clearance;
    private final RequestReviewService review;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;
    private final RequestFleetService fleet;

    public RequestApprovalService(
            TransportRequestRepository requests,
            QuotationRepository quotations,
            TransportJobRepository jobs,
            UserRepository users,
            TransportJobService jobService,
            ClearanceService clearance,
            RequestReviewService review,
            AuditService audit,
            NotificationService notifications,
            Clock clock,
            RequestFleetService fleet) {
        this.requests = requests;
        this.quotations = quotations;
        this.jobs = jobs;
        this.users = users;
        this.jobService = jobService;
        this.clearance = clearance;
        this.review = review;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
        this.fleet = fleet;
    }

    /** Who can be put on the job: every active specialist and coordinator, fewest open jobs first. */
    @Transactional(readOnly = true)
    public ApprovalOptionsResponse options() {
        List<User> specialists = users.findByRoleAndStatus(RoleName.TRANSPORT_SPECIALIST, UserStatus.ACTIVE);
        List<User> coordinators = users.findByRoleAndStatus(RoleName.FLEET_COORDINATOR, UserStatus.ACTIVE);
        return ApprovalMapper.toOptions(
                specialists,
                specialists.isEmpty() ? Map.of() : counts(jobs.countOpenBySpecialist(ids(specialists))),
                coordinators,
                coordinators.isEmpty() ? Map.of() : counts(jobs.countOpenByCoordinator(ids(coordinators))));
    }

    /**
     * Approves an accepted request into its job. Everything is checked first, with the request row locked: the
     * request is CUSTOMER_ACCEPTED, its accepted version is there, it has no job yet, both team members are active in
     * their roles, and the destination has a published regulation catalog for the checklist. Then the request becomes
     * APPROVED, which locks its horse list (BR-F1-06, trigger), the job is created, the checklist generated, and the
     * club and the team are told.
     */
    @Transactional
    public RequestReviewResponse approve(User manager, UUID id, ApproveRequest body) {
        TransportRequest request = requests.findByIdForUpdate(id)
                .filter(r -> r.getStatus() != RequestStatus.DRAFT)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", id));
        if (request.getStatus() != RequestStatus.CUSTOMER_ACCEPTED) {
            throw new ConflictException(
                    "REQUEST_NOT_ACCEPTED",
                    request.getStatus() == RequestStatus.APPROVED
                            ? request.getCode() + " is already approved."
                            : request.getCode() + " can be approved once the customer accepts its quotation; it is "
                                    + RequestReviewService.statusWords(request.getStatus()) + ".");
        }
        if (jobs.existsByRequestId(request.getId())) {
            throw new ConflictException("JOB_EXISTS", request.getCode() + " already has its job.");
        }
        Quotation accepted = quotations
                .findFirstByRequestIdAndStatusOrderByVersionNoDesc(request.getId(), QuotationStatus.ACCEPTED)
                .orElseThrow(() -> new ConflictException(
                        "NO_ACCEPTED_QUOTATION", request.getCode() + " has no accepted quotation to approve."));
        User specialist =
                teamMember(body.transportSpecialistId(), RoleName.TRANSPORT_SPECIALIST, "transport specialist");
        User coordinator = teamMember(body.coordinatorId(), RoleName.FLEET_COORDINATOR, "fleet & route coordinator");
        clearance.requireChecklistSource(request);
        // The hold placed at acceptance is checked again, or placed now (US-F7-02); none free never blocks approval.
        fleet.recheck(request);

        Instant now = clock.instant();
        request.setStatus(RequestStatus.APPROVED);
        requests.saveAndFlush(request);
        TransportJob job = jobService.createApproved(request, accepted, manager, specialist, coordinator, now);
        clearance.generateChecklist(job.getId(), manager);

        audit.recordDecision(
                manager,
                "REQUEST_APPROVED",
                AuditText.fit("Approved into job " + job.getCode() + " at quotation " + accepted.getCode() + " v"
                        + accepted.getVersionNo() + "; " + specialist.displayName() + ", transport specialist, and "
                        + coordinator.displayName() + ", fleet & route coordinator"),
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                null,
                "{\"status\":\"" + RequestStatus.CUSTOMER_ACCEPTED + "\"}",
                "{\"status\":\"" + RequestStatus.APPROVED + "\",\"job\":\"" + job.getCode() + "\"}");
        notifications.notify(
                NotificationKind.REQUEST_APPROVED,
                Audience.club(request.getClub().getId()),
                Subject.request(request),
                request.getCode() + " is approved: job " + job.getCode(),
                "Follow the move with " + job.getCode() + ". Your document checklist is open.");
        String route = request.getCode() + ", " + request.getHorses().size()
                + (request.getHorses().size() == 1 ? " horse" : " horses");
        notifications.notify(
                NotificationKind.JOB_ASSIGNED,
                Audience.staff(specialist),
                Subject.job(job),
                "You own the documents for " + job.getCode(),
                route + ". Its checklist is generated from the pinned regulation catalogs.");
        notifications.notify(
                NotificationKind.JOB_ASSIGNED,
                Audience.staff(coordinator),
                Subject.job(job),
                "You plan " + job.getCode(),
                route + ". It is in the planning backlog.");
        return review.view(request.getId());
    }

    /**
     * Rejects a request before it is approved (BR-F1-04, spec §2.4 A3): the reason is required, kept on the request
     * and sent to the club, which may copy the request into a new draft.
     */
    @Transactional
    public RequestReviewResponse reject(User manager, UUID id, String rawReason) {
        String reason = rawReason == null ? "" : rawReason.strip();
        if (reason.isEmpty()) {
            throw new BusinessException("REASON_REQUIRED", "Say why the request is rejected; the customer reads it.");
        }
        if (reason.length() > REASON_MAX) {
            throw new BusinessException(
                    "REASON_TOO_LONG",
                    "The reason is " + reason.length() + " characters; keep it to " + REASON_MAX + ".");
        }
        TransportRequest request = requests.findByIdForUpdate(id)
                .filter(r -> r.getStatus() != RequestStatus.DRAFT)
                .orElseThrow(() -> ResourceNotFoundException.of("Request", id));
        RequestStatus before = request.getStatus();
        if (!REJECTABLE.contains(before)) {
            throw new ConflictException(
                    "REQUEST_NOT_REJECTABLE",
                    request.getCode() + " can't be rejected; it is " + RequestReviewService.statusWords(before) + ".");
        }

        request.setStatus(RequestStatus.REJECTED);
        request.setRejectReason(reason);
        requests.saveAndFlush(request);
        fleet.release(request, "the request was rejected.");

        audit.recordDecision(
                manager,
                "REQUEST_REJECTED",
                AuditText.fit("Rejected: " + reason),
                ENTITY_TYPE,
                request.getId(),
                request.getCode(),
                reason,
                "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + RequestStatus.REJECTED + "\"}");
        notifications.notify(
                NotificationKind.REQUEST_REJECTED,
                Audience.club(request.getClub().getId()),
                Subject.request(request),
                request.getCode() + " was rejected",
                reason);
        return review.view(request.getId());
    }

    /** An active user with the role; anyone else is refused with what was wrong. */
    private User teamMember(UUID userId, String role, String words) {
        return users.findByRoleAndStatus(role, UserStatus.ACTIVE).stream()
                .filter(u -> u.getId().equals(userId))
                .findFirst()
                .orElseThrow(() ->
                        new BusinessException("TEAM_MEMBER_INVALID", "Choose an active " + words + " for the job."));
    }

    private static List<UUID> ids(List<User> people) {
        return people.stream().map(User::getId).toList();
    }

    private static Map<UUID, Long> counts(List<UserJobCount> rows) {
        return rows.stream().collect(Collectors.toMap(UserJobCount::getUserId, UserJobCount::getJobs));
    }
}
