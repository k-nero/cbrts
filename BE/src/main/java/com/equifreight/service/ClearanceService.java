package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.*;
import com.equifreight.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    public ClearanceService(
            ChecklistItemRepository checklistItemRepository,
            DocumentVersionRepository documentVersionRepository,
            TransportJobRepository transportJobRepository,
            QuarantinePeriodRepository quarantinePeriodRepository,
            AuthoritySubmissionRepository authoritySubmissionRepository,
            ValidityEngine validityEngine,
            AuditService auditService,
            FileService fileService) {
        this.checklistItemRepository = checklistItemRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.transportJobRepository = transportJobRepository;
        this.quarantinePeriodRepository = quarantinePeriodRepository;
        this.authoritySubmissionRepository = authoritySubmissionRepository;
        this.validityEngine = validityEngine;
        this.auditService = auditService;
        this.fileService = fileService;
    }

    /** Retrieve all checklist items for a transport job. */
    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> getChecklist(UUID jobId) {
        findJobOrThrow(jobId);
        return checklistItemRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toItemResponse)
                .toList();
    }

    /** Customer-scoped checklist: checks that the job belongs to the authenticated customer's club. */
    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> getCustomerChecklist(UUID jobId, User customer) {
        TransportJob job = findJobOrThrow(jobId);
        assertClubOwnsJob(job, customer);
        return checklistItemRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toItemResponse)
                .toList();
    }

    /** Retrieve unreviewed document versions for the specialist inbox with pagination. */
    @Transactional(readOnly = true)
    public Page<DocumentVersionResponse> getPendingReviews(Pageable pageable) {
        return documentVersionRepository.findAllByReview(DocumentReview.PENDING, pageable)
                .map(ClearanceMapper::toVersionResponse);
    }

    /** Retrieve unreviewed document versions for the specialist inbox as a list. */
    @Transactional(readOnly = true)
    public List<DocumentVersionResponse> getPendingReviews() {
        return documentVersionRepository.findAllByReview(DocumentReview.PENDING).stream()
                .map(ClearanceMapper::toVersionResponse)
                .toList();
    }

    /** List active transport jobs for clearance staff dropdown selection. */
    @Transactional(readOnly = true)
    public List<JobSummaryResponse> getActiveJobs() {
        return transportJobRepository.findAll().stream()
                .map(job -> JobSummaryResponse.builder()
                        .id(job.getId())
                        .code(job.getCode())
                        .dossierStatus(job.getDossierStatus())
                        .stage(job.getStage())
                        .clubName(job.getRequest() != null && job.getRequest().getClub() != null
                                ? job.getRequest().getClub().getName()
                                : null)
                        .build())
                .toList();
    }

    /** Customer document upload: enforces that the checklist item belongs to the customer's club job (US-F2-03). */
    @Transactional
    public ChecklistItemResponse uploadCustomerDocumentVersion(UUID checklistItemId, DocumentUploadRequest request, User customer) {
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
    public ChecklistItemResponse uploadDocumentVersion(UUID checklistItemId, DocumentUploadRequest request, User uploader) {
        ChecklistItem item = findChecklistItemOrThrow(checklistItemId);

        // Require that the file exists, belongs to the caller, and is not already attached (PR #79)
        StoredFile file = fileService.requireAttachable(request.getFileId(), uploader);

        short nextVersionNo = (short) (documentVersionRepository.findMaxVersionNoByChecklistItemId(checklistItemId)
                .orElse((short) 0) + 1);

        DocumentVersion candidate = new DocumentVersion();
        candidate.setChecklistItem(item);
        candidate.setVersionNo(nextVersionNo);
        candidate.setFile(file);
        candidate.setIssuedOn(request.getIssuedOn());
        candidate.setSampledOn(request.getSampledOn());
        candidate.setValidUntil(request.getValidUntil());
        candidate.setIssuer(request.getIssuer());
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
    public DocumentVersionResponse reviewDocument(UUID documentVersionId, ReviewDocumentRequest request, User reviewer) {
        if (request.getReview() == null || request.getReview() == DocumentReview.PENDING) {
            throw new BusinessException("INVALID_REVIEW_DECISION", "A review decision must be either APPROVED or REJECTED");
        }

        DocumentVersion version = documentVersionRepository.findById(documentVersionId)
                .orElseThrow(() -> ResourceNotFoundException.of("DocumentVersion", documentVersionId));

        if (version.getReview() != DocumentReview.PENDING) {
            throw new ConflictException("VERSION_ALREADY_REVIEWED", "This document version has already been reviewed");
        }

        ChecklistItem item = version.getChecklistItem();
        if (item == null) {
            throw new IllegalStateException("Document version is not associated with any checklist item");
        }

        // Prevent reviewing superseded versions (Finding 3)
        if (item.getCurrentVersion() == null || !item.getCurrentVersion().getId().equals(version.getId())) {
            throw new ConflictException("VERSION_SUPERSEDED", "Only the current version of a document can be reviewed");
        }

        if (request.getReview() == DocumentReview.REJECTED) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new BusinessException("REJECT_REASON_REQUIRED", "A reason must be provided when rejecting a document version (BR-F2-07)");
            }
        } else if (request.getReview() == DocumentReview.APPROVED) {
            ValidityEngine.Result valResult = validityEngine.evaluate(item, version, item.getJob());
            if (valResult.validity() == Validity.RED) {
                throw new BusinessException("DOCUMENT_VALIDITY_RED", "A document evaluated as RED cannot be approved: " + valResult.note());
            }
        }

        // Apply changes to version
        version.setReview(request.getReview());
        version.setReviewedBy(reviewer);
        version.setReviewedAt(Instant.now());
        version.setRejectReason(request.getRejectReason());
        DocumentVersion updatedVersion = documentVersionRepository.save(version);

        if (request.getReview() == DocumentReview.APPROVED) {
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
        String action = request.getReview() == DocumentReview.APPROVED ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED";
        String summary = String.format("%s %s v%d for job %s.",
                request.getReview() == DocumentReview.APPROVED ? "Approved" : "Rejected",
                docName, version.getVersionNo(), jobCode);

        auditService.recordDecision(
                reviewer,
                action,
                summary,
                "DOCUMENT_VERSION",
                version.getId(),
                jobCode,
                request.getRejectReason(),
                "PENDING",
                request.getReview().name());

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
     * 3. All authority submissions are ISSUED (no refused, pending, or info-requested submissions).
     */
    @Transactional
    public ClearanceStatusResponse evaluateClearanceGate(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        List<ChecklistItem> items = checklistItemRepository.findByJobId(jobId);
        List<QuarantinePeriod> quarantines = quarantinePeriodRepository.findByJobId(jobId);
        List<AuthoritySubmission> submissions = authoritySubmissionRepository.findByJobId(jobId);

        List<String> outstandingIssues = new ArrayList<>();
        int totalMandatory = 0;
        int clearedMandatory = 0;

        for (ChecklistItem item : items) {
            boolean isMandatory = item.getRegulationRule() == null || item.getRegulationRule().isMandatory();
            if (isMandatory) {
                totalMandatory++;
                if (item.getStatus() == ChecklistStatus.CLEARED && item.getValidity() == Validity.GREEN) {
                    clearedMandatory++;
                } else {
                    String docName = item.getDocumentType() != null ? item.getDocumentType().getName() : "Document";
                    String horseInfo = item.getHorse() != null ? " (Horse: " + item.getHorse().getName() + ")" : "";
                    outstandingIssues.add(String.format("%s%s not cleared (Status: %s, Validity: %s)",
                            docName, horseInfo, item.getStatus(), item.getValidity()));
                }
            }
        }

        boolean allQuarantinesCompleted = true;
        int completedQuarantines = 0;
        for (QuarantinePeriod q : quarantines) {
            if (q.getCompletedAt() != null) {
                completedQuarantines++;
            } else {
                allQuarantinesCompleted = false;
                outstandingIssues.add(String.format("Quarantine period pending (starts %s, ends %s)",
                        q.getStartsOn(), q.getEndsOn()));
            }
        }

        boolean hasRefusedSubmissions = false;
        boolean hasPendingSubmissions = false;
        boolean hasAdditionalInfoSubmissions = false;

        for (AuthoritySubmission s : submissions) {
            String authName = s.getAuthority() != null ? s.getAuthority().getName() : "Authority";
            if (s.getStatus() == SubmissionStatus.REFUSED) {
                hasRefusedSubmissions = true;
                outstandingIssues.add(String.format("Authority submission %s refused by %s", s.getKind(), authName));
            } else if (s.getStatus() == SubmissionStatus.ADDITIONAL_INFO) {
                hasAdditionalInfoSubmissions = true;
                outstandingIssues.add(String.format("Additional info requested by %s for %s", authName, s.getKind()));
            } else if (s.getStatus() == SubmissionStatus.READY_TO_FILE || s.getStatus() == SubmissionStatus.FILED) {
                hasPendingSubmissions = true;
                outstandingIssues.add(String.format("Authority submission %s pending with %s (%s)", s.getKind(), authName, s.getStatus()));
            }
        }

        // If the trip has already departed, never modify the dossier state or clearance gate (Finding 2).
        if (job.getDepartedAt() != null) {
            return buildStatusResponse(job, items, quarantines, totalMandatory, clearedMandatory, allQuarantinesCompleted, outstandingIssues);
        }

        boolean allSubmissionsIssued = !hasRefusedSubmissions && !hasPendingSubmissions && !hasAdditionalInfoSubmissions;
        boolean ready = (totalMandatory > 0 && clearedMandatory == totalMandatory)
                && allQuarantinesCompleted
                && allSubmissionsIssued;

        DossierStatus previousStatus = job.getDossierStatus();

        if (ready) {
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
        } else {
            DossierStatus targetStatus;
            if (hasAdditionalInfoSubmissions) {
                targetStatus = DossierStatus.ADDITIONAL_INFO_REQUIRED;
            } else if (hasPendingSubmissions) {
                targetStatus = DossierStatus.SUBMITTED_TO_AUTHORITY;
            } else {
                targetStatus = DossierStatus.OPEN;
            }

            if (job.getDossierStatus() != targetStatus) {
                DossierStatus oldStatus = job.getDossierStatus();
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
                        String.join("; ", outstandingIssues),
                        oldStatus != null ? oldStatus.name() : "OPEN",
                        targetStatus.name());
            }
        }

        return buildStatusResponse(job, items, quarantines, totalMandatory, clearedMandatory, allQuarantinesCompleted, outstandingIssues);
    }

    /** Retrieve clearance gate status without mutating state. */
    @Transactional(readOnly = true)
    public ClearanceStatusResponse getClearanceStatus(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        List<ChecklistItem> items = checklistItemRepository.findByJobId(jobId);
        List<QuarantinePeriod> quarantines = quarantinePeriodRepository.findByJobId(jobId);
        List<AuthoritySubmission> submissions = authoritySubmissionRepository.findByJobId(jobId);

        List<String> outstandingIssues = new ArrayList<>();
        int totalMandatory = 0;
        int clearedMandatory = 0;

        for (ChecklistItem item : items) {
            boolean isMandatory = item.getRegulationRule() == null || item.getRegulationRule().isMandatory();
            if (isMandatory) {
                totalMandatory++;
                if (item.getStatus() == ChecklistStatus.CLEARED && item.getValidity() == Validity.GREEN) {
                    clearedMandatory++;
                } else {
                    String docName = item.getDocumentType() != null ? item.getDocumentType().getName() : "Document";
                    String horseInfo = item.getHorse() != null ? " (Horse: " + item.getHorse().getName() + ")" : "";
                    outstandingIssues.add(String.format("%s%s: %s (Validity: %s)",
                            docName, horseInfo, item.getStatus(), item.getValidity()));
                }
            }
        }

        boolean allQuarantinesCompleted = true;
        int completedQuarantines = 0;
        for (QuarantinePeriod q : quarantines) {
            if (q.getCompletedAt() != null) {
                completedQuarantines++;
            } else {
                allQuarantinesCompleted = false;
                outstandingIssues.add(String.format("Quarantine pending: %s to %s", q.getStartsOn(), q.getEndsOn()));
            }
        }

        for (AuthoritySubmission s : submissions) {
            String authName = s.getAuthority() != null ? s.getAuthority().getName() : "Authority";
            if (s.getStatus() == SubmissionStatus.REFUSED) {
                outstandingIssues.add(String.format("Submission %s refused by %s", s.getKind(), authName));
            } else if (s.getStatus() == SubmissionStatus.ADDITIONAL_INFO) {
                outstandingIssues.add(String.format("Additional info requested by %s for %s", authName, s.getKind()));
            } else if (s.getStatus() == SubmissionStatus.READY_TO_FILE || s.getStatus() == SubmissionStatus.FILED) {
                outstandingIssues.add(String.format("Submission %s pending with %s (%s)", s.getKind(), authName, s.getStatus()));
            }
        }

        return buildStatusResponse(job, items, quarantines, totalMandatory, clearedMandatory, allQuarantinesCompleted, outstandingIssues);
    }

    private ClearanceStatusResponse buildStatusResponse(
            TransportJob job,
            List<ChecklistItem> items,
            List<QuarantinePeriod> quarantines,
            int totalMandatory,
            int clearedMandatory,
            boolean allQuarantinesCompleted,
            List<String> outstandingIssues) {
        return ClearanceStatusResponse.builder()
                .jobId(job.getId())
                .jobCode(job.getCode())
                .dossierStatus(job.getDossierStatus())
                .clearanceReady(job.getDossierStatus() == DossierStatus.CLEARANCE_READY)
                .clearanceReadyAt(job.getClearanceReadyAt())
                .totalChecklistItems(items.size())
                .mandatoryItems(totalMandatory)
                .clearedMandatoryItems(clearedMandatory)
                .totalQuarantines(quarantines.size())
                .completedQuarantines((int) quarantines.stream().filter(q -> q.getCompletedAt() != null).count())
                .allQuarantinesCompleted(allQuarantinesCompleted)
                .outstandingIssues(outstandingIssues)
                .build();
    }

    private void assertClubOwnsJob(TransportJob job, User user) {
        if (user == null || user.getClub() == null || job == null || job.getRequest() == null
                || job.getRequest().getClub() == null
                || !user.getClub().getId().equals(job.getRequest().getClub().getId())) {
            throw ResourceNotFoundException.of("TransportJob", job != null ? job.getId() : null);
        }
    }

    private TransportJob findJobOrThrow(UUID jobId) {
        return transportJobRepository.findById(jobId)
                .orElseThrow(() -> ResourceNotFoundException.of("TransportJob", jobId));
    }

    private ChecklistItem findChecklistItemOrThrow(UUID checklistItemId) {
        return checklistItemRepository.findById(checklistItemId)
                .orElseThrow(() -> ResourceNotFoundException.of("ChecklistItem", checklistItemId));
    }
}
