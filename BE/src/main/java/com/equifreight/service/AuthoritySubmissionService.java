package com.equifreight.service;

import com.equifreight.configuration.AppConstants;
import com.equifreight.entity.*;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.SubmissionStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.*;
import com.equifreight.repository.*;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service managing veterinary, customs, and quarantine authority submissions and quarantine tracks (AGENTS.md).
 * Uses business calendar zone (Asia/Ho_Chi_Minh) and enforces file attachability rules.
 */
@Service
public class AuthoritySubmissionService {

    private final AuthorityRepository authorityRepository;
    private final AuthoritySubmissionRepository submissionRepository;
    private final TransportJobRepository transportJobRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final QuarantinePeriodRepository quarantinePeriodRepository;
    private final PlaceRepository placeRepository;
    private final HorseRepository horseRepository;
    private final FileService fileService;
    private final AuditService auditService;
    private final ClearanceService clearanceService;
    private final NotificationService notificationService;

    public AuthoritySubmissionService(
            AuthorityRepository authorityRepository,
            AuthoritySubmissionRepository submissionRepository,
            TransportJobRepository transportJobRepository,
            ChecklistItemRepository checklistItemRepository,
            QuarantinePeriodRepository quarantinePeriodRepository,
            PlaceRepository placeRepository,
            HorseRepository horseRepository,
            FileService fileService,
            AuditService auditService,
            ClearanceService clearanceService,
            NotificationService notificationService) {
        this.authorityRepository = authorityRepository;
        this.submissionRepository = submissionRepository;
        this.transportJobRepository = transportJobRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.quarantinePeriodRepository = quarantinePeriodRepository;
        this.placeRepository = placeRepository;
        this.horseRepository = horseRepository;
        this.fileService = fileService;
        this.auditService = auditService;
        this.clearanceService = clearanceService;
        this.notificationService = notificationService;
    }

    /**
     * List all recognized authorities (Veterinary, Customs, Quarantine).
     */
    @Transactional(readOnly = true)
    public List<AuthorityResponse> listAuthorities(
            String countryCode, com.equifreight.entity.enums.AuthorityKind kind) {
        return authorityRepository.findAll().stream()
                .filter(a -> countryCode == null
                        || countryCode.isBlank()
                        || a.getCountry().getCode().equalsIgnoreCase(countryCode.trim()))
                .filter(a -> kind == null || a.getKind() == kind)
                .map(ClearanceMapper::toAuthorityResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<com.equifreight.model.route.PlaceResponse> listQuarantineFacilities() {
        return placeRepository.findByKind(com.equifreight.entity.enums.PlaceKind.QUARANTINE).stream()
                .map(com.equifreight.model.route.RouteMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AuthoritySubmissionResponse> getSubmissionsByJob(UUID jobId) {
        return listSubmissionsByJob(jobId);
    }

    public List<AuthorityResponse> listAuthorities(String countryCode) {
        if (countryCode != null && !countryCode.isBlank()) {
            return authorityRepository.findByCountryCode(countryCode.trim().toUpperCase()).stream()
                    .map(ClearanceMapper::toAuthorityResponse)
                    .toList();
        }
        return authorityRepository.findAll().stream()
                .map(ClearanceMapper::toAuthorityResponse)
                .toList();
    }

    /**
     * List all authority submissions filed for a transport job.
     */
    @Transactional(readOnly = true)
    public List<AuthoritySubmissionResponse> listSubmissionsByJob(UUID jobId) {
        findJobOrThrow(jobId);
        return submissionRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toSubmissionResponse)
                .toList();
    }

    /**
     * File a new authority submission dossier on behalf of transport specialist (Flow 2, B11).
     * Validates that all associated checklist items strictly belong to the specified job.
     */
    @Transactional
    public AuthoritySubmissionResponse createSubmission(
            UUID jobId, CreateAuthoritySubmissionRequest request, User specialist) {
        TransportJob job = findJobOrThrow(jobId);
        Authority authority = authorityRepository
                .findById(request.authorityId())
                .orElseThrow(() -> ResourceNotFoundException.of("Authority", request.authorityId()));

        AuthoritySubmission submission = new AuthoritySubmission();
        submission.setJob(job);
        submission.setAuthority(authority);
        submission.setKind(request.kind());
        submission.setStatus(SubmissionStatus.FILED);
        submission.setFiledAt(Instant.now());
        submission.setFiledBy(specialist);
        submission.setReferenceNo(request.referenceNo());

        // SLA deadline calculated using business calendar zone (Asia/Ho_Chi_Minh)
        if (request.expectedBy() != null) {
            submission.setExpectedBy(request.expectedBy());
        } else if (authority.getSlaDays() != null) {
            submission.setExpectedBy(LocalDate.now(AppConstants.BUSINESS_ZONE).plusDays(authority.getSlaDays()));
        }

        if (request.checklistItemIds() != null && !request.checklistItemIds().isEmpty()) {
            Set<ChecklistItem> items = new HashSet<>();
            for (UUID cid : request.checklistItemIds()) {
                ChecklistItem ci = checklistItemRepository
                        .findById(cid)
                        .orElseThrow(() -> ResourceNotFoundException.of("ChecklistItem", cid));
                if (!ci.getJob().getId().equals(job.getId())) {
                    throw new ConflictException(
                            "CHECKLIST_ITEM_MISMATCH",
                            "Checklist item " + cid + " does not belong to job " + job.getId());
                }
                items.add(ci);
            }
            submission.setChecklistItems(items);
        }

        AuthoritySubmission saved = submissionRepository.save(submission);

        // Audit log (BR-F1-08)
        auditService.recordDecision(
                specialist,
                "AUTHORITY_SUBMISSION_CREATED",
                String.format(
                        "Filed %s submission to %s for job %s.", request.kind(), authority.getName(), job.getCode()),
                "AUTHORITY_SUBMISSION",
                saved.getId(),
                job.getCode(),
                null,
                null,
                "FILED");

        // The gate derives SUBMITTED_TO_AUTHORITY from the open filing, and leaves a departed job alone.
        clearanceService.evaluateClearanceGate(job.getId());
        return ClearanceMapper.toSubmissionResponse(saved);
    }

    /**
     * Update an authority submission outcome (FILED -> ADDITIONAL_INFO -> ISSUED / REFUSED).
     */
    @Transactional
    public AuthoritySubmissionResponse updateSubmission(
            UUID submissionId, UpdateAuthoritySubmissionRequest request, User specialist) {
        AuthoritySubmission submission = submissionRepository
                .findById(submissionId)
                .orElseThrow(() -> ResourceNotFoundException.of("AuthoritySubmission", submissionId));

        SubmissionStatus prevStatus = submission.getStatus();
        submission.setStatus(request.status());

        if (request.referenceNo() != null) {
            submission.setReferenceNo(request.referenceNo());
        }
        if (request.expectedBy() != null) {
            submission.setExpectedBy(request.expectedBy());
        }

        if (request.status() == SubmissionStatus.ISSUED) {
            submission.setIssuedAt(Instant.now());
            if (request.resultFileId() != null) {
                // Enforce attachability rules (PR #79)
                StoredFile resultFile = fileService.requireAttachable(request.resultFileId(), specialist);
                submission.setResultFile(resultFile);
            }
        } else if (request.status() == SubmissionStatus.REFUSED) {
            alertManager(
                    submission,
                    NotificationKind.DOSSIER_REFUSED,
                    submission.getAuthority().getName() + " refused " + submission.getKind() + " for "
                            + submission.getJob().getCode(),
                    "Reschedule or re-file before the departure slot is lost.");
        } else if (request.status() == SubmissionStatus.ADDITIONAL_INFO) {
            // ADDITIONAL_INFO_REQUIRED is set by the gate run below.
            TransportJob job = submission.getJob();

            if (job.getRequest() != null) {
                notificationService.notify(
                        NotificationKind.AUTHORITY_INFO_REQUIRED,
                        Audience.club(job.getRequest().getClub().getId()),
                        Subject.authoritySubmission(submission),
                        "Additional information requested by "
                                + submission.getAuthority().getName(),
                        "Authority requested additional documentation for submission " + submission.getKind());
            }
            alertManager(
                    submission,
                    NotificationKind.DOSSIER_BLOCKED,
                    submission.getAuthority().getName() + " asked for more information on " + submission.getKind()
                            + " for " + job.getCode(),
                    "The dossier is blocked until the customer sends it.");
        }

        AuthoritySubmission updated = submissionRepository.save(submission);

        // Audit log (BR-F1-08)
        String jobCode = submission.getJob() != null ? submission.getJob().getCode() : "JOB";
        auditService.recordDecision(
                specialist,
                "AUTHORITY_SUBMISSION_UPDATED",
                String.format("Updated authority submission status to %s for job %s.", request.status(), jobCode),
                "AUTHORITY_SUBMISSION",
                updated.getId(),
                jobCode,
                null,
                prevStatus != null ? prevStatus.name() : "FILED",
                request.status().name());

        clearanceService.evaluateClearanceGate(submission.getJob().getId());
        return ClearanceMapper.toSubmissionResponse(updated);
    }

    /**
     * List quarantine periods scheduled or completed for a job.
     */
    @Transactional(readOnly = true)
    public List<QuarantinePeriodResponse> listQuarantines(UUID jobId) {
        findJobOrThrow(jobId);
        return quarantinePeriodRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toQuarantineResponse)
                .toList();
    }

    /**
     * Schedule a new quarantine period for a horse or the entire job shipment.
     */
    @Transactional
    public QuarantinePeriodResponse createQuarantine(
            UUID jobId, CreateQuarantinePeriodRequest request, User specialist) {
        TransportJob job = findJobOrThrow(jobId);
        Place place = placeRepository
                .findById(request.placeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Place", request.placeId()));

        Horse horse = null;
        if (request.horseId() != null) {
            horse = horseRepository
                    .findById(request.horseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Horse", request.horseId()));
        }

        if (request.endsOn().isBefore(request.startsOn())) {
            throw new BusinessException("Quarantine end date cannot precede start date.");
        }
        // The pinned destination catalog sets the minimum stay; a shorter one is refused, not warned about.
        clearanceService.destinationVersion(jobId).ifPresent(destination -> {
            long days = ChronoUnit.DAYS.between(request.startsOn(), request.endsOn());
            if (days < destination.getQuarantineMinDays())
                throw new BusinessException(
                        "QUARANTINE_TOO_SHORT",
                        "%s requires at least %d days of quarantine; this period is %d."
                                .formatted(
                                        destination.getCatalog().getName(), destination.getQuarantineMinDays(), days));
        });

        QuarantinePeriod quarantine = new QuarantinePeriod();
        quarantine.setJob(job);
        quarantine.setHorse(horse);
        quarantine.setPlace(place);
        quarantine.setStartsOn(request.startsOn());
        quarantine.setEndsOn(request.endsOn());

        QuarantinePeriod saved = quarantinePeriodRepository.save(quarantine);

        auditService.recordDecision(
                specialist,
                "QUARANTINE_CREATED",
                String.format("Scheduled quarantine at %s for job %s.", place.getName(), job.getCode()),
                "QUARANTINE_PERIOD",
                saved.getId(),
                job.getCode(),
                null,
                null,
                "SCHEDULED");

        clearanceService.evaluateClearanceGate(job.getId());
        return ClearanceMapper.toQuarantineResponse(saved);
    }

    /**
     * Confirm quarantine completion by supervising vet / transport specialist.
     */
    @Transactional
    public QuarantinePeriodResponse completeQuarantine(UUID quarantineId, User specialist) {
        QuarantinePeriod quarantine = quarantinePeriodRepository
                .findById(quarantineId)
                .orElseThrow(() -> ResourceNotFoundException.of("QuarantinePeriod", quarantineId));

        if (quarantine.getCompletedAt() != null) {
            throw new BusinessException("This quarantine period has already been completed.");
        }

        quarantine.setCompletedAt(Instant.now());
        QuarantinePeriod updated = quarantinePeriodRepository.save(quarantine);

        String jobCode = quarantine.getJob() != null ? quarantine.getJob().getCode() : "JOB";
        auditService.recordDecision(
                specialist,
                "QUARANTINE_COMPLETED",
                String.format("Completed quarantine for job %s.", jobCode),
                "QUARANTINE_PERIOD",
                updated.getId(),
                jobCode,
                null,
                "ACTIVE",
                "COMPLETED");

        clearanceService.evaluateClearanceGate(quarantine.getJob().getId());
        return ClearanceMapper.toQuarantineResponse(updated);
    }

    /**
     * US-F2-07: alerts the logistics manager who approved the job about every submission still open after the
     * day the authority was expected to answer (an SLA breach). Run once a day, so a breach is repeated daily
     * until the authority answers. Returns how many alerts were sent.
     */
    @Transactional
    public int alertLateSubmissions(LocalDate today) {
        List<AuthoritySubmission> late = submissionRepository.findByStatusInAndExpectedByBefore(
                List.of(SubmissionStatus.FILED, SubmissionStatus.ADDITIONAL_INFO), today);
        int alerted = 0;
        for (AuthoritySubmission s : late) {
            if (alertManager(
                    s,
                    NotificationKind.DOSSIER_LATE,
                    s.getKind() + " for " + s.getJob().getCode() + " is late",
                    s.getAuthority().getName() + " was expected to answer by " + s.getExpectedBy()
                            + " and the submission is still " + s.getStatus() + ".",
                    // Repeated daily until the authority answers: one unread row, bumped to the top.
                    "DOSSIER_LATE:" + s.getId())) {
                alerted++;
            }
        }
        return alerted;
    }

    private void alertManager(AuthoritySubmission submission, NotificationKind kind, String title, String body) {
        alertManager(submission, kind, title, body, null);
    }

    /** Notifies the logistics manager who approved the submission's job; false when no one approved it. */
    private boolean alertManager(
            AuthoritySubmission submission, NotificationKind kind, String title, String body, String dedupeKey) {
        User manager = submission.getJob().getApprovedBy();
        if (manager == null) {
            return false;
        }
        notificationService.notify(
                kind, Audience.staff(manager), Subject.authoritySubmission(submission), title, body, dedupeKey);
        return true;
    }

    private TransportJob findJobOrThrow(UUID jobId) {
        return transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> ResourceNotFoundException.of("TransportJob", jobId));
    }
}
