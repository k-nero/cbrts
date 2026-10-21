package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.*;
import com.equifreight.repository.*;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Flow 2: Clearance Dossier and Legal Document Management Service (AGENTS.md).
 * Manages document checklists, validity evaluation, specialist reviews, authority status, and the clearance gate.
 */
@Service
public class ClearanceService {

    private final ChecklistItemRepository checklistItemRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final TransportJobRepository transportJobRepository;
    private final QuarantinePeriodRepository quarantinePeriodRepository;
    private final AuthoritySubmissionRepository authoritySubmissionRepository;
    private final ValidityEngine validityEngine;
    private final AuditService auditService;
    private final FileService fileService;
    private final JobRegulationPinRepository pins;

    public ClearanceService(
            ChecklistItemRepository checklistItemRepository,
            DocumentVersionRepository documentVersionRepository,
            TransportJobRepository transportJobRepository,
            QuarantinePeriodRepository quarantinePeriodRepository,
            AuthoritySubmissionRepository authoritySubmissionRepository,
            ValidityEngine validityEngine,
            AuditService auditService,
            FileService fileService,
            JobRegulationPinRepository pins) {
        this.checklistItemRepository = checklistItemRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.transportJobRepository = transportJobRepository;
        this.quarantinePeriodRepository = quarantinePeriodRepository;
        this.authoritySubmissionRepository = authoritySubmissionRepository;
        this.validityEngine = validityEngine;
        this.auditService = auditService;
        this.fileService = fileService;
        this.pins = pins;
    }

    /**
     * Only the most recent submission to an authority for a kind counts; earlier ones are history.
     */
    private static List<AuthoritySubmission> latestPerAuthorityAndKind(List<AuthoritySubmission> submissions) {
        Map<String, AuthoritySubmission> latest = new LinkedHashMap<>();
        Comparator<AuthoritySubmission> byTime =
                Comparator.comparing(ClearanceService::submittedAt, Comparator.nullsFirst(Comparator.naturalOrder()));
        for (AuthoritySubmission s : submissions) {
            String key = (s.getAuthority() != null ? s.getAuthority().getId() : null) + "|" + s.getKind();
            latest.merge(key, s, (a, b) -> byTime.compare(a, b) >= 0 ? a : b);
        }
        return new ArrayList<>(latest.values());
    }

    private static Instant submittedAt(AuthoritySubmission s) {
        return s.getFiledAt() != null ? s.getFiledAt() : s.getCreatedAt();
    }

    /**
     * Retrieve all checklist items for a transport job.
     */
    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> getChecklist(UUID jobId) {
        findJobOrThrow(jobId);
        return checklistItemRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toItemResponse)
                .toList();
    }

    /**
     * Customer-scoped checklist: checks that the job belongs to the authenticated customer's club.
     */
    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> getCustomerChecklist(UUID jobId, User customer) {
        TransportJob job = findJobOrThrow(jobId);
        assertClubOwnsJob(job, customer);
        return checklistItemRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toItemResponse)
                .toList();
    }

    /**
     * Retrieve unreviewed document versions for the specialist inbox with pagination.
     */
    @Transactional(readOnly = true)
    public Page<DocumentVersionResponse> getPendingReviews(Pageable pageable) {
        return documentVersionRepository
                .findAllByReview(DocumentReview.PENDING, pageable)
                .map(ClearanceMapper::toVersionResponse);
    }

    /**
     * Retrieve unreviewed document versions for the specialist inbox as a list.
     */
    @Transactional(readOnly = true)
    public List<DocumentVersionResponse> getPendingReviews() {
        return documentVersionRepository.findAllByReview(DocumentReview.PENDING).stream()
                .map(ClearanceMapper::toVersionResponse)
                .toList();
    }

    /**
     * Jobs whose dossier is still open (not departed) for the specialist's job picker, searchable by code or club.
     */
    @Transactional(readOnly = true)
    public Page<JobSummaryResponse> getActiveJobs(String q, Pageable pageable) {
        return transportJobRepository
                .findOpenDossiers(q == null ? "" : q.strip(), pageable)
                .map(ClearanceMapper::toJobSummaryResponse);
    }

    /**
     * Customer document upload: enforces that the checklist item belongs to the customer's club job (US-F2-03).
     */
    @Transactional
    public ChecklistItemResponse uploadCustomerDocumentVersion(
            UUID checklistItemId, DocumentUploadRequest request, User customer) {
        ChecklistItem item = findChecklistItemOrThrow(checklistItemId);
        assertClubOwnsJob(item.getJob(), customer);
        return uploadDocumentVersion(checklistItemId, request, customer);
    }

    /**
     * Upload a new document version for a checklist item (Append-only).
     * Validates that the file is attachable (US-F2-03), verifies dates, evaluates validity BEFORE saving,
     * refuses RED documents (US-F2-09), updates item status, writes audit log, and re-evaluates the gate (US-F2-08).
     */
    @Transactional
    public ChecklistItemResponse uploadDocumentVersion(
            UUID checklistItemId, DocumentUploadRequest request, User uploader) {
        ChecklistItem item = findChecklistItemOrThrow(checklistItemId);

        // Require that the file exists, belongs to the caller, and is not already attached (PR #79)
        StoredFile file = fileService.requireAttachable(request.fileId(), uploader);

        short nextVersionNo = (short) (documentVersionRepository
                        .findMaxVersionNoByChecklistItemId(checklistItemId)
                        .orElse((short) 0)
                + 1);

        DocumentVersion candidate = new DocumentVersion();
        candidate.setChecklistItem(item);
        candidate.setVersionNo(nextVersionNo);
        candidate.setFile(file);
        candidate.setIssuedOn(request.issuedOn());
        candidate.setSampledOn(request.sampledOn());
        candidate.setValidUntil(request.validUntil());
        candidate.setIssuer(request.issuer());
        candidate.setUploadedBy(uploader);
        candidate.setUploadedAt(Instant.now());
        candidate.setReview(DocumentReview.PENDING);

        // Validate, then write (US-F2-03, US-F2-09, AGENTS.md):
        // Evaluate validity on the unsaved version first; refuse RED with clear error before persisting.
        ValidityEngine.Result valResult = validityEngine.evaluate(item, candidate, item.getJob());
        if (valResult.validity() == Validity.RED) {
            throw new ConflictException("DOCUMENT_VALIDITY_RED", "Document validity check failed: " + valResult.note());
        }

        DocumentVersion savedVersion = documentVersionRepository.save(candidate);

        item.setCurrentVersion(savedVersion);
        item.setStatus(ChecklistStatus.IN_REVIEW);
        item.setHolder(ChecklistHolder.SPECIALIST);
        item.setValidity(valResult.validity());
        item.setValidityNote(valResult.note());
        item.setEvaluatedAt(Instant.now());
        checklistItemRepository.save(item);

        // Record audit log for the upload (BR-F1-08)
        String jobCode = item.getJob() != null ? item.getJob().getCode() : "JOB";
        String docName = item.getDocumentType() != null ? item.getDocumentType().getName() : "Document";
        auditService.recordDecision(
                uploader,
                "DOCUMENT_UPLOADED",
                String.format("Uploaded %s v%d for job %s.", docName, nextVersionNo, jobCode),
                "DOCUMENT_VERSION",
                savedVersion.getId(),
                jobCode,
                null,
                null,
                "PENDING");

        // Re-evaluate gate immediately so a new unreviewed upload closes any ready gate (US-F2-08)
        if (item.getJob() != null) {
            evaluateClearanceGate(item.getJob().getId());
        }

        return ClearanceMapper.toItemResponse(item);
    }

    /**
     * Transport specialist review decision (BR-F2-04, BR-F2-05, BR-F2-07).
     * Enforces validate-then-write, refuses superseded versions or invalid review states,
     * and audits the decision in the same transaction.
     */
    @Transactional
    public DocumentVersionResponse reviewDocument(
            UUID documentVersionId, ReviewDocumentRequest request, User reviewer) {
        if (request.review() == null || request.review() == DocumentReview.PENDING) {
            throw new BusinessException(
                    "INVALID_REVIEW_DECISION", "A review decision must be either APPROVED or REJECTED");
        }

        DocumentVersion version = documentVersionRepository
                .findById(documentVersionId)
                .orElseThrow(() -> ResourceNotFoundException.of("DocumentVersion", documentVersionId));

        if (version.getReview() != DocumentReview.PENDING) {
            throw new ConflictException("VERSION_ALREADY_REVIEWED", "This document version has already been reviewed");
        }

        ChecklistItem item = version.getChecklistItem();
        if (item == null) {
            throw new IllegalStateException("Document version is not associated with any checklist item");
        }

        // Prevent reviewing superseded versions (Finding 3)
        if (item.getCurrentVersion() == null
                || !item.getCurrentVersion().getId().equals(version.getId())) {
            throw new ConflictException("VERSION_SUPERSEDED", "Only the current version of a document can be reviewed");
        }

        if (request.review() == DocumentReview.REJECTED) {
            if (request.rejectReason() == null || request.rejectReason().isBlank()) {
                throw new BusinessException(
                        "REJECT_REASON_REQUIRED",
                        "A reason must be provided when rejecting a document version (BR-F2-07)");
            }
        } else if (request.review() == DocumentReview.APPROVED) {
            ValidityEngine.Result valResult = validityEngine.evaluate(item, version, item.getJob());
            if (valResult.validity() == Validity.RED) {
                throw new BusinessException(
                        "DOCUMENT_VALIDITY_RED", "A document evaluated as RED cannot be approved: " + valResult.note());
            }
        }

        // Apply changes to version
        version.setReview(request.review());
        version.setReviewedBy(reviewer);
        version.setReviewedAt(Instant.now());
        version.setRejectReason(request.rejectReason());
        DocumentVersion updatedVersion = documentVersionRepository.save(version);

        if (request.review() == DocumentReview.APPROVED) {
            item.setStatus(ChecklistStatus.CLEARED);
            item.setHolder(null);
        } else {
            item.setStatus(ChecklistStatus.REJECTED);
            item.setHolder(ChecklistHolder.CUSTOMER);
        }
        checklistItemRepository.save(item);

        // Record audit
        String jobCode = item.getJob() != null ? item.getJob().getCode() : "JOB";
        String docName = item.getDocumentType() != null ? item.getDocumentType().getName() : "Document";
        String action = request.review() == DocumentReview.APPROVED ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED";
        String summary = String.format(
                "%s %s v%d for job %s.",
                request.review() == DocumentReview.APPROVED ? "Approved" : "Rejected",
                docName,
                version.getVersionNo(),
                jobCode);

        auditService.recordDecision(
                reviewer,
                action,
                summary,
                "DOCUMENT_VERSION",
                version.getId(),
                jobCode,
                request.rejectReason(),
                "PENDING",
                request.review().name());

        // Re-evaluate clearance gate
        if (item.getJob() != null) {
            evaluateClearanceGate(item.getJob().getId());
        }

        return ClearanceMapper.toVersionResponse(updatedVersion);
    }

    /**
     * Evaluates and updates the Clearance Gate status for a job (BR-F2-03, US-F2-08).
     * Gate is CLEARANCE_READY only if:
     * 1. All mandatory items are CLEARED with GREEN validity.
     * 2. All required quarantine periods are completed.
     * 3. The latest submission to each authority for each kind is ISSUED. A refusal that was
     * re-filed and then issued no longer blocks; an earlier issue that was later refused does.
     * The dossier status is derived here and nowhere else, so filing, info requests and reviews
     * all go through the same departure guard.
     */
    @Transactional
    public ClearanceStatusResponse evaluateClearanceGate(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        GateAssessment gate = assess(job);

        // If the trip has already departed, never modify the dossier state or clearance gate (Finding 2).
        if (job.getDepartedAt() != null) {
            return gate.toResponse(job, destinationVersion(job.getId()).orElse(null));
        }

        DossierStatus previousStatus = job.getDossierStatus();
        DossierStatus targetStatus = gate.ready()
                ? DossierStatus.CLEARANCE_READY
                : gate.hasAdditionalInfo()
                        ? DossierStatus.ADDITIONAL_INFO_REQUIRED
                        : gate.hasPending() ? DossierStatus.SUBMITTED_TO_AUTHORITY : DossierStatus.OPEN;

        if (targetStatus == DossierStatus.CLEARANCE_READY) {
            job.setDossierStatus(DossierStatus.CLEARANCE_READY);
            if (job.getClearanceReadyAt() == null) {
                job.setClearanceReadyAt(Instant.now());
            }
            if (job.getStage() == JobStage.DOCUMENTS) {
                job.setStage(JobStage.CLEARANCE);
            }
            transportJobRepository.save(job);

            if (previousStatus != DossierStatus.CLEARANCE_READY) {
                auditService.recordDecision(
                        null,
                        "CLEARANCE_GATE_PASSED",
                        String.format("Clearance dossier for job %s transitioned to CLEARANCE_READY.", job.getCode()),
                        "TRANSPORT_JOB",
                        job.getId(),
                        job.getCode(),
                        null,
                        previousStatus != null ? previousStatus.name() : "OPEN",
                        "CLEARANCE_READY");
            }
        } else if (previousStatus != targetStatus) {
            job.setDossierStatus(targetStatus);
            job.setClearanceReadyAt(null);
            transportJobRepository.save(job);

            auditService.recordDecision(
                    null,
                    "CLEARANCE_GATE_BLOCKED",
                    String.format("Clearance dossier for job %s set to %s.", job.getCode(), targetStatus),
                    "TRANSPORT_JOB",
                    job.getId(),
                    job.getCode(),
                    String.join("; ", gate.outstandingIssues()),
                    previousStatus != null ? previousStatus.name() : "OPEN",
                    targetStatus.name());
        }

        return gate.toResponse(job, destinationVersion(job.getId()).orElse(null));
    }

    /**
     * Re-evaluates every document checklist item for the job against the job's planned schedule
     * (US-F3-03, US-F2-10, AGENTS.md).
     * Refuses changes after departure.
     */
    @Transactional
    public void recheckJobDocuments(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        if (job.getDepartedAt() != null) {
            throw new BusinessException("Cannot recheck documents after job has departed");
        }
        List<ChecklistItem> items = checklistItemRepository.findByJobId(jobId);
        for (ChecklistItem item : items) {
            if (item.getCurrentVersion() != null) {
                ValidityEngine.Result result = validityEngine.evaluate(item, item.getCurrentVersion(), job);
                item.setValidity(result.validity());
                item.setValidityNote(result.note());
                if (result.validity() == Validity.RED && item.getStatus() == ChecklistStatus.CLEARED) {
                    item.setStatus(ChecklistStatus.IN_REVIEW);
                }
                checklistItemRepository.save(item);
            }
        }
        evaluateClearanceGate(jobId);
    }

    /**
     * Retrieve clearance gate status without mutating state.
     */
    @Transactional(readOnly = true)
    public ClearanceStatusResponse getClearanceStatus(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        return assess(job).toResponse(job, destinationVersion(job.getId()).orElse(null));
    }

    /**
     * What the gate sees for a job right now; shared by the evaluating and the read-only path.
     */
    private GateAssessment assess(TransportJob job) {
        List<ChecklistItem> items = checklistItemRepository.findByJobId(job.getId());
        List<QuarantinePeriod> quarantines = quarantinePeriodRepository.findByJobId(job.getId());
        List<AuthoritySubmission> submissions =
                latestPerAuthorityAndKind(authoritySubmissionRepository.findByJobId(job.getId()));

        List<String> outstandingIssues = new ArrayList<>();
        int totalMandatory = 0;
        int clearedMandatory = 0;
        for (ChecklistItem item : items) {
            boolean isMandatory =
                    item.getRegulationRule() == null || item.getRegulationRule().isMandatory();
            if (!isMandatory) {
                continue;
            }
            totalMandatory++;
            if (item.getStatus() == ChecklistStatus.CLEARED && item.getValidity() == Validity.GREEN) {
                clearedMandatory++;
            } else {
                String docName =
                        item.getDocumentType() != null ? item.getDocumentType().getName() : "Document";
                String horseInfo =
                        item.getHorse() != null ? " for " + item.getHorse().getName() : "";
                outstandingIssues.add("%s%s is not cleared: %s, validity %s"
                        .formatted(
                                docName,
                                horseInfo,
                                ClearanceText.status(item.getStatus()),
                                ClearanceText.validity(item.getValidity())));
            }
        }

        int completedQuarantines = 0;
        for (QuarantinePeriod q : quarantines) {
            if (q.getCompletedAt() != null) {
                completedQuarantines++;
            } else {
                outstandingIssues.add("Quarantine from %s to %s is not signed off yet"
                        .formatted(ClearanceText.day(q.getStartsOn()), ClearanceText.day(q.getEndsOn())));
            }
        }

        boolean hasRefused = false;
        boolean hasPending = false;
        boolean hasAdditionalInfo = false;
        for (AuthoritySubmission s : submissions) {
            String authName = s.getAuthority() != null ? s.getAuthority().getName() : "the authority";
            String dossier = ClearanceText.submission(s.getKind());
            switch (s.getStatus()) {
                case REFUSED -> {
                    hasRefused = true;
                    outstandingIssues.add("%s refused by %s".formatted(dossier, authName));
                }
                case ADDITIONAL_INFO -> {
                    hasAdditionalInfo = true;
                    outstandingIssues.add("%s: %s asked for more information".formatted(dossier, authName));
                }
                case READY_TO_FILE -> {
                    hasPending = true;
                    outstandingIssues.add("%s not filed with %s yet".formatted(dossier, authName));
                }
                case FILED -> {
                    hasPending = true;
                    outstandingIssues.add("%s waiting on %s".formatted(dossier, authName));
                }
                case ISSUED -> {}
            }
        }

        boolean allQuarantinesCompleted = completedQuarantines == quarantines.size();
        boolean ready = totalMandatory > 0
                && clearedMandatory == totalMandatory
                && allQuarantinesCompleted
                && !hasRefused
                && !hasPending
                && !hasAdditionalInfo;
        return new GateAssessment(
                items.size(),
                totalMandatory,
                clearedMandatory,
                quarantines.size(),
                completedQuarantines,
                ready,
                hasPending,
                hasAdditionalInfo,
                outstandingIssues);
    }

    private void assertClubOwnsJob(TransportJob job, User user) {
        if (user == null
                || user.getClub() == null
                || job == null
                || job.getRequest() == null
                || job.getRequest().getClub() == null
                || !user.getClub().getId().equals(job.getRequest().getClub().getId())) {
            throw ResourceNotFoundException.of("TransportJob", job != null ? job.getId() : null);
        }
    }

    private TransportJob findJobOrThrow(UUID jobId) {
        return transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> ResourceNotFoundException.of("TransportJob", jobId));
    }

    /** The destination regulation version the job was pinned to at approval, if it has been. */
    @Transactional(readOnly = true)
    public Optional<RegulationVersion> destinationVersion(UUID jobId) {
        return pins.findByJobId(jobId).stream()
                .filter(pin -> pin.getRole() == RegulationRole.DESTINATION)
                .map(JobRegulationPin::getRegulationVersion)
                .findFirst();
    }

    private ChecklistItem findChecklistItemOrThrow(UUID checklistItemId) {
        return checklistItemRepository
                .findById(checklistItemId)
                .orElseThrow(() -> ResourceNotFoundException.of("ChecklistItem", checklistItemId));
    }

    private record GateAssessment(
            int totalItems,
            int mandatoryItems,
            int clearedMandatoryItems,
            int totalQuarantines,
            int completedQuarantines,
            boolean ready,
            boolean hasPending,
            boolean hasAdditionalInfo,
            List<String> outstandingIssues) {
        ClearanceStatusResponse toResponse(TransportJob job, RegulationVersion destination) {
            return ClearanceMapper.toStatusResponse(
                    job,
                    destination,
                    totalItems,
                    mandatoryItems,
                    clearedMandatoryItems,
                    totalQuarantines,
                    completedQuarantines,
                    outstandingIssues);
        }
    }
}
