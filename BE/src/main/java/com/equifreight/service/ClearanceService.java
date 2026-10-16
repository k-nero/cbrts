package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.exception.UnauthorizedException;
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
 * Manages document checklists, validity evaluation, specialist reviews, and the clearance gate.
 */
@Service
public class ClearanceService {

    private final ChecklistItemRepository checklistItemRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final TransportJobRepository transportJobRepository;
    private final StoredFileRepository storedFileRepository;
    private final QuarantinePeriodRepository quarantinePeriodRepository;
    private final ValidityEngine validityEngine;
    private final AuditService auditService;

    public ClearanceService(
            ChecklistItemRepository checklistItemRepository,
            DocumentVersionRepository documentVersionRepository,
            TransportJobRepository transportJobRepository,
            StoredFileRepository storedFileRepository,
            QuarantinePeriodRepository quarantinePeriodRepository,
            ValidityEngine validityEngine,
            AuditService auditService) {
        this.checklistItemRepository = checklistItemRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.transportJobRepository = transportJobRepository;
        this.storedFileRepository = storedFileRepository;
        this.quarantinePeriodRepository = quarantinePeriodRepository;
        this.validityEngine = validityEngine;
        this.auditService = auditService;
    }

    /** Retrieve all checklist items for a transport job. */
    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> getChecklist(UUID jobId) {
        findJobOrThrow(jobId);
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

    /**
     * Upload a new document version for a checklist item (Append-only).
     * Re-runs the validity engine and updates the checklist item status.
     */
    @Transactional
    public ChecklistItemResponse uploadDocumentVersion(UUID checklistItemId, DocumentUploadRequest request, User uploader) {
        ChecklistItem item = findChecklistItemOrThrow(checklistItemId);
        StoredFile file = storedFileRepository.findById(request.getFileId())
                .orElseThrow(() -> ResourceNotFoundException.of("File", request.getFileId()));

        short nextVersionNo = (short) (documentVersionRepository.findMaxVersionNoByChecklistItemId(checklistItemId)
                .orElse((short) 0) + 1);

        DocumentVersion version = new DocumentVersion();
        version.setChecklistItem(item);
        version.setVersionNo(nextVersionNo);
        version.setFile(file);
        version.setIssuedOn(request.getIssuedOn());
        version.setSampledOn(request.getSampledOn());
        version.setValidUntil(request.getValidUntil());
        version.setIssuer(request.getIssuer());
        version.setUploadedBy(uploader);
        version.setUploadedAt(Instant.now());
        version.setReview(DocumentReview.PENDING);

        DocumentVersion savedVersion = documentVersionRepository.save(version);

        item.setCurrentVersion(savedVersion);
        item.setStatus(ChecklistStatus.IN_REVIEW);
        item.setHolder(ChecklistHolder.SPECIALIST);

        // Evaluate validity using the business rules engine (BR-F2-02)
        ValidityEngine.Result valResult = validityEngine.evaluate(item, savedVersion, item.getJob());
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

        return ClearanceMapper.toItemResponse(item);
    }

    /**
     * Transport specialist review decision (BR-F2-04, BR-F2-05, BR-F2-07).
     * Enforces validate-then-write and audits the decision in the same transaction.
     */
    @Transactional
    public DocumentVersionResponse reviewDocument(UUID documentVersionId, ReviewDocumentRequest request, User reviewer) {
        // Enforce role: only Transport Specialist may review documents (AGENTS.md)
        boolean isSpecialist = reviewer != null && reviewer.getRoles() != null && reviewer.getRoles().stream()
                .map(Role::getName)
                .anyMatch(RoleName.TRANSPORT_SPECIALIST::equals);
        if (!isSpecialist) {
            throw new UnauthorizedException("Only the Transport Specialist is authorized to review documents.");
        }

        DocumentVersion version = documentVersionRepository.findById(documentVersionId)
                .orElseThrow(() -> ResourceNotFoundException.of("DocumentVersion", documentVersionId));

        // Immutable append-only check: only PENDING versions may be reviewed
        if (version.getReview() != DocumentReview.PENDING) {
            throw new ConflictException("DOCUMENT_ALREADY_REVIEWED", "This document version has already been reviewed.");
        }

        ChecklistItem item = version.getChecklistItem();

        // Validate-then-write: check all conditions BEFORE making any state changes
        if (request.getReview() == DocumentReview.REJECTED) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new BusinessException("A rejection reason is required.");
            }
        } else if (request.getReview() == DocumentReview.APPROVED) {
            ValidityEngine.Result valResult = validityEngine.evaluate(item, version, item.getJob());
            if (valResult.validity() == Validity.RED) {
                throw new BusinessException("A document evaluated as RED cannot be approved: " + valResult.note());
            }
        }

        // Apply changes
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

        // Audit the review decision (BR-F1-08)
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
     * Evaluates and updates the Clearance Gate status for a job (BR-F2-03).
     * Clearance dossier is CLEARANCE_READY only if all mandatory items are CLEARED with GREEN validity,
     * and all required quarantine periods are completed.
     */
    @Transactional
    public ClearanceStatusResponse evaluateClearanceGate(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        List<ChecklistItem> items = checklistItemRepository.findByJobId(jobId);
        List<QuarantinePeriod> quarantines = quarantinePeriodRepository.findByJobId(jobId);

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

        boolean ready = (totalMandatory > 0 && clearedMandatory == totalMandatory) && allQuarantinesCompleted;
        DossierStatus previousStatus = job.getDossierStatus();

        if (ready) {
            job.setDossierStatus(DossierStatus.CLEARANCE_READY);
            job.setClearanceReadyAt(Instant.now());
            job.setStage(JobStage.CLEARANCE);
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
        } else if (job.getDossierStatus() == DossierStatus.CLEARANCE_READY) {
            job.setDossierStatus(DossierStatus.OPEN);
            job.setClearanceReadyAt(null);
            transportJobRepository.save(job);

            auditService.recordDecision(
                    null,
                    "CLEARANCE_GATE_BLOCKED",
                    String.format("Clearance dossier for job %s re-opened due to incomplete items or expired validity.", job.getCode()),
                    "TRANSPORT_JOB",
                    job.getId(),
                    job.getCode(),
                    String.join("; ", outstandingIssues),
                    "CLEARANCE_READY",
                    "OPEN");
        }

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
                .completedQuarantines(completedQuarantines)
                .allQuarantinesCompleted(allQuarantinesCompleted)
                .outstandingIssues(outstandingIssues)
                .build();
    }

    /** Retrieve clearance gate status without mutating state. */
    @Transactional(readOnly = true)
    public ClearanceStatusResponse getClearanceStatus(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        List<ChecklistItem> items = checklistItemRepository.findByJobId(jobId);
        List<QuarantinePeriod> quarantines = quarantinePeriodRepository.findByJobId(jobId);

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
                .completedQuarantines(completedQuarantines)
                .allQuarantinesCompleted(allQuarantinesCompleted)
                .outstandingIssues(outstandingIssues)
                .build();
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
