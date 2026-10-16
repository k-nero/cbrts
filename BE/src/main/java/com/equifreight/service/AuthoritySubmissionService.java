package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.AuthorityKind;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.SubmissionStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.model.clearance.*;
import com.equifreight.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Service managing regulatory authority filings and quarantine tracking (AGENTS.md).
 * Transport Specialists submit dossier packets to veterinary/customs agencies and track outcomes.
 */
@Service
public class AuthoritySubmissionService {

    private final AuthorityRepository authorityRepository;
    private final AuthoritySubmissionRepository submissionRepository;
    private final QuarantinePeriodRepository quarantinePeriodRepository;
    private final TransportJobRepository transportJobRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final StoredFileRepository storedFileRepository;
    private final PlaceRepository placeRepository;
    private final HorseRepository horseRepository;
    private final NotificationService notificationService;
    private final ClearanceService clearanceService;
    private final AuditService auditService;

    public AuthoritySubmissionService(
            AuthorityRepository authorityRepository,
            AuthoritySubmissionRepository submissionRepository,
            QuarantinePeriodRepository quarantinePeriodRepository,
            TransportJobRepository transportJobRepository,
            ChecklistItemRepository checklistItemRepository,
            StoredFileRepository storedFileRepository,
            PlaceRepository placeRepository,
            HorseRepository horseRepository,
            NotificationService notificationService,
            ClearanceService clearanceService,
            AuditService auditService) {
        this.authorityRepository = authorityRepository;
        this.submissionRepository = submissionRepository;
        this.quarantinePeriodRepository = quarantinePeriodRepository;
        this.transportJobRepository = transportJobRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.storedFileRepository = storedFileRepository;
        this.placeRepository = placeRepository;
        this.horseRepository = horseRepository;
        this.notificationService = notificationService;
        this.clearanceService = clearanceService;
        this.auditService = auditService;
    }

    /** List government authorities filtered optionally by country and kind. */
    @Transactional(readOnly = true)
    public List<AuthorityResponse> listAuthorities(String countryCode, AuthorityKind kind) {
        List<Authority> list;
        if (countryCode != null && !countryCode.isBlank() && kind != null) {
            list = authorityRepository.findByCountryCodeAndKind(countryCode, kind);
        } else if (countryCode != null && !countryCode.isBlank()) {
            list = authorityRepository.findByCountryCode(countryCode);
        } else if (kind != null) {
            list = authorityRepository.findByKind(kind);
        } else {
            list = authorityRepository.findAll();
        }
        return list.stream().map(ClearanceMapper::toAuthorityResponse).toList();
    }

    /** List all authority submissions filed for a transport job. */
    @Transactional(readOnly = true)
    public List<AuthoritySubmissionResponse> getSubmissionsByJob(UUID jobId) {
        findJobOrThrow(jobId);
        return submissionRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toSubmissionResponse)
                .toList();
    }

    /** File a new submission with a government authority. */
    @Transactional
    public AuthoritySubmissionResponse createSubmission(UUID jobId, CreateAuthoritySubmissionRequest request, User specialist) {
        assertSpecialist(specialist);
        TransportJob job = findJobOrThrow(jobId);
        Authority authority = authorityRepository.findById(request.getAuthorityId())
                .orElseThrow(() -> ResourceNotFoundException.of("Authority", request.getAuthorityId()));

        AuthoritySubmission submission = new AuthoritySubmission();
        submission.setJob(job);
        submission.setAuthority(authority);
        submission.setKind(request.getKind());
        submission.setStatus(SubmissionStatus.FILED);
        submission.setFiledAt(Instant.now());
        submission.setFiledBy(specialist);
        submission.setReferenceNo(request.getReferenceNo());

        // SLA calculation
        if (request.getExpectedBy() != null) {
            submission.setExpectedBy(request.getExpectedBy());
        } else if (authority.getSlaDays() != null) {
            submission.setExpectedBy(LocalDate.now().plusDays(authority.getSlaDays()));
        }

        // Attach checklist items
        if (request.getChecklistItemIds() != null && !request.getChecklistItemIds().isEmpty()) {
            Set<ChecklistItem> items = new HashSet<>(checklistItemRepository.findAllById(request.getChecklistItemIds()));
            submission.setChecklistItems(items);
        }

        AuthoritySubmission saved = submissionRepository.save(submission);

        job.setDossierStatus(DossierStatus.SUBMITTED_TO_AUTHORITY);
        transportJobRepository.save(job);

        // Audit log (BR-F1-08)
        auditService.recordDecision(
                specialist,
                "AUTHORITY_SUBMISSION_CREATED",
                String.format("Filed %s submission to %s for job %s.",
                        request.getKind(), authority.getName(), job.getCode()),
                "AUTHORITY_SUBMISSION",
                saved.getId(),
                job.getCode(),
                null,
                null,
                "FILED");

        return ClearanceMapper.toSubmissionResponse(saved);
    }

    /** Update an authority submission outcome (FILED -> ADDITIONAL_INFO -> ISSUED / REFUSED). */
    @Transactional
    public AuthoritySubmissionResponse updateSubmission(UUID submissionId, UpdateAuthoritySubmissionRequest request, User specialist) {
        assertSpecialist(specialist);
        AuthoritySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> ResourceNotFoundException.of("AuthoritySubmission", submissionId));

        SubmissionStatus prevStatus = submission.getStatus();
        submission.setStatus(request.getStatus());

        if (request.getReferenceNo() != null) {
            submission.setReferenceNo(request.getReferenceNo());
        }
        if (request.getExpectedBy() != null) {
            submission.setExpectedBy(request.getExpectedBy());
        }

        if (request.getStatus() == SubmissionStatus.ISSUED) {
            submission.setIssuedAt(Instant.now());
            if (request.getResultFileId() != null) {
                StoredFile resultFile = storedFileRepository.findById(request.getResultFileId())
                        .orElseThrow(() -> ResourceNotFoundException.of("File", request.getResultFileId()));
                submission.setResultFile(resultFile);
            }
        } else if (request.getStatus() == SubmissionStatus.ADDITIONAL_INFO) {
            TransportJob job = submission.getJob();
            job.setDossierStatus(DossierStatus.ADDITIONAL_INFO_REQUIRED);
            transportJobRepository.save(job);

            if (job.getRequest() != null && job.getRequest().getCreatedBy() != null) {
                notificationService.sendNotification(
                        job.getRequest().getCreatedBy(),
                        "ADDITIONAL_INFO_REQUIRED",
                        "Additional information requested by " + submission.getAuthority().getName(),
                        "Authority requested additional documentation for submission " + submission.getKind(),
                        "AuthoritySubmission",
                        submission.getId()
                );
            }
        }

        AuthoritySubmission updated = submissionRepository.save(submission);

        // Audit log (BR-F1-08)
        String jobCode = submission.getJob() != null ? submission.getJob().getCode() : "JOB";
        auditService.recordDecision(
                specialist,
                "AUTHORITY_SUBMISSION_UPDATED",
                String.format("Updated authority submission status to %s for job %s.", request.getStatus(), jobCode),
                "AUTHORITY_SUBMISSION",
                updated.getId(),
                jobCode,
                null,
                prevStatus != null ? prevStatus.name() : "FILED",
                request.getStatus().name());

        clearanceService.evaluateClearanceGate(submission.getJob().getId());
        return ClearanceMapper.toSubmissionResponse(updated);
    }

    /** List quarantine periods scheduled or completed for a job. */
    @Transactional(readOnly = true)
    public List<QuarantinePeriodResponse> listQuarantines(UUID jobId) {
        findJobOrThrow(jobId);
        return quarantinePeriodRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toQuarantineResponse)
                .toList();
    }

    /** Schedule a new quarantine period for a horse or the entire job shipment. */
    @Transactional
    public QuarantinePeriodResponse createQuarantine(UUID jobId, CreateQuarantinePeriodRequest request, User specialist) {
        assertSpecialist(specialist);
        TransportJob job = findJobOrThrow(jobId);
        Place place = placeRepository.findById(request.getPlaceId())
                .orElseThrow(() -> ResourceNotFoundException.of("Place", request.getPlaceId()));

        Horse horse = null;
        if (request.getHorseId() != null) {
            horse = horseRepository.findById(request.getHorseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Horse", request.getHorseId()));
        }

        if (request.getEndsOn().isBefore(request.getStartsOn())) {
            throw new BusinessException("Quarantine end date cannot precede start date.");
        }

        QuarantinePeriod quarantine = new QuarantinePeriod();
        quarantine.setJob(job);
        quarantine.setHorse(horse);
        quarantine.setPlace(place);
        quarantine.setStartsOn(request.getStartsOn());
        quarantine.setEndsOn(request.getEndsOn());

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

    /** Confirm quarantine completion by supervising vet / transport specialist. */
    @Transactional
    public QuarantinePeriodResponse completeQuarantine(UUID quarantineId, User specialist) {
        assertSpecialist(specialist);
        QuarantinePeriod quarantine = quarantinePeriodRepository.findById(quarantineId)
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

    private void assertSpecialist(User user) {
        if (user == null || user.getRoles() == null) {
            throw new UnauthorizedException("Authentication is required.");
        }
        boolean hasPerm = user.getRoles().stream()
                .map(Role::getName)
                .anyMatch(RoleName.TRANSPORT_SPECIALIST::equals);
        if (!hasPerm) {
            throw new UnauthorizedException("Only Transport Specialists are authorized for regulatory authority operations.");
        }
    }

    private TransportJob findJobOrThrow(UUID jobId) {
        return transportJobRepository.findById(jobId)
                .orElseThrow(() -> ResourceNotFoundException.of("TransportJob", jobId));
    }
}
