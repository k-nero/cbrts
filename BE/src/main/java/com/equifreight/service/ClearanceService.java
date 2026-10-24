package com.equifreight.service;

import com.equifreight.configuration.AppConstants;
import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.*;
import com.equifreight.repository.*;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
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
    private final JobRegulationPinRepository jobRegulationPinRepository;
    private final RegulationCatalogRepository regulationCatalogRepository;
    private final RegulationVersionRepository regulationVersionRepository;
    private final RegulationRuleRepository regulationRuleRepository;
    private final Clock clock;

    public ClearanceService(
            ChecklistItemRepository checklistItemRepository,
            DocumentVersionRepository documentVersionRepository,
            TransportJobRepository transportJobRepository,
            QuarantinePeriodRepository quarantinePeriodRepository,
            AuthoritySubmissionRepository authoritySubmissionRepository,
            ValidityEngine validityEngine,
            AuditService auditService,
            FileService fileService,
            JobRegulationPinRepository jobRegulationPinRepository,
            RegulationCatalogRepository regulationCatalogRepository,
            RegulationVersionRepository regulationVersionRepository,
            RegulationRuleRepository regulationRuleRepository,
            Clock clock) {
        this.checklistItemRepository = checklistItemRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.transportJobRepository = transportJobRepository;
        this.quarantinePeriodRepository = quarantinePeriodRepository;
        this.authoritySubmissionRepository = authoritySubmissionRepository;
        this.validityEngine = validityEngine;
        this.auditService = auditService;
        this.fileService = fileService;
        this.jobRegulationPinRepository = jobRegulationPinRepository;
        this.regulationCatalogRepository = regulationCatalogRepository;
        this.regulationVersionRepository = regulationVersionRepository;
        this.regulationRuleRepository = regulationRuleRepository;
        this.clock = clock;
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
     * US-F2-02: the checklist behind one of the customer's requests. Empty until the request is approved into a job
     * and its checklist is generated.
     */
    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> getCustomerRequestChecklist(UUID requestId, User customer) {
        return transportJobRepository
                .findByRequestId(requestId)
                .map(job -> {
                    assertClubOwnsJob(job, customer);
                    return checklistItemRepository.findByJobId(job.getId()).stream()
                            .map(ClearanceMapper::toItemResponse)
                            .toList();
                })
                .orElse(List.of());
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
     * US-F2-03: the automatic check on a document's dates, run before its file is uploaded so a refused certificate
     * is never stored. Saves nothing; attaching the file runs the same check again.
     */
    @Transactional(readOnly = true)
    public DocumentCheckResponse checkCustomerDocument(
            UUID checklistItemId, DocumentCheckRequest dates, User customer) {
        ChecklistItem item = findChecklistItemOrThrow(checklistItemId);
        assertCustomerMayUpload(item, customer);
        assertDatesMakeSense(dates.issuedOn(), dates.sampledOn(), dates.validUntil());
        DocumentVersion candidate = new DocumentVersion();
        candidate.setIssuedOn(dates.issuedOn());
        candidate.setSampledOn(dates.sampledOn());
        candidate.setValidUntil(dates.validUntil());
        ValidityEngine.Result result = validityEngine.evaluate(item, candidate, item.getJob());
        return new DocumentCheckResponse(
                result.validity(), result.note(), result.rule(), result.found(), result.required(), result.renewBy());
    }

    /** US-F2-03: every version of one of the customer's documents, newest first (BR-F2-05). */
    @Transactional(readOnly = true)
    public List<DocumentVersionResponse> getCustomerVersions(UUID checklistItemId, User customer) {
        ChecklistItem item = findChecklistItemOrThrow(checklistItemId);
        assertClubOwnsJob(item.getJob(), customer);
        return documentVersionRepository.findByChecklistItemIdOrderByVersionNoDesc(checklistItemId).stream()
                .map(ClearanceMapper::toVersionResponse)
                .toList();
    }

    /**
     * Customer document upload (US-F2-03): the item must be one of the club's own documents that is still open.
     */
    @Transactional
    public ChecklistItemResponse uploadCustomerDocumentVersion(
            UUID checklistItemId, DocumentUploadRequest request, User customer) {
        assertCustomerMayUpload(findChecklistItemOrThrow(checklistItemId), customer);
        return uploadDocumentVersion(checklistItemId, request, customer);
    }

    /**
     * A customer uploads only their own club's documents, only the ones they provide (an authority's permit is filed
     * by staff), only before departure, and not once a document is cleared with nothing left to fix.
     */
    private void assertCustomerMayUpload(ChecklistItem item, User customer) {
        assertClubOwnsJob(item.getJob(), customer);
        if (item.getDocumentType() != null && item.getDocumentType().getProvidedBy() == DocumentProvider.AUTHORITY) {
            throw new ConflictException(
                    "DOCUMENT_FROM_AUTHORITY", "This document is issued by an authority; we file it for you.");
        }
        if (item.getJob().getDepartedAt() != null) {
            throw new ConflictException("JOB_DEPARTED", "The horses have left, so this document can't change.");
        }
        if (item.getStatus() == ChecklistStatus.CLEARED && item.getValidity() == Validity.GREEN) {
            throw new ConflictException("DOCUMENT_CLEARED", "This document is cleared; nothing more is needed.");
        }
    }

    /** Dates a certificate can't have, refused whatever the rule says (US-F2-03). */
    private void assertDatesMakeSense(LocalDate issuedOn, LocalDate sampledOn, LocalDate validUntil) {
        LocalDate today = LocalDate.now(clock.withZone(AppConstants.BUSINESS_ZONE));
        if (issuedOn.isAfter(today)) {
            throw new BusinessException("DOCUMENT_DATES_INVALID", "The issue date can't be in the future.");
        }
        if (sampledOn != null && sampledOn.isAfter(issuedOn)) {
            throw new BusinessException("DOCUMENT_DATES_INVALID", "The sample date can't be after the issue date.");
        }
        if (validUntil.isBefore(issuedOn)) {
            throw new BusinessException(
                    "DOCUMENT_DATES_INVALID", "The valid-until date can't be before the issue date.");
        }
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

        assertDatesMakeSense(request.issuedOn(), request.sampledOn(), request.validUntil());

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
            throw new ConflictException("DOCUMENT_VALIDITY_RED", "Refused: " + valResult.note());
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
     * US-F2-04 (issue #88): Details for reviewing one document version on its own screen.
     */
    @Transactional(readOnly = true)
    public DocumentReviewDetailResponse getDocumentReviewDetail(UUID versionId) {
        DocumentVersion version = documentVersionRepository
                .findById(versionId)
                .orElseThrow(() -> ResourceNotFoundException.of("DocumentVersion", versionId));

        ChecklistItem item = version.getChecklistItem();
        TransportJob job = item != null ? item.getJob() : null;

        List<DocumentVersion> allVersions = item != null
                ? documentVersionRepository.findByChecklistItemIdOrderByVersionNoDesc(item.getId())
                : List.of(version);

        List<DocumentVersion> queue = documentVersionRepository.findAllByReview(DocumentReview.PENDING);
        int at = -1;
        for (int i = 0; i < queue.size(); i++) {
            if (queue.get(i).getId().equals(versionId)) {
                at = i;
                break;
            }
        }
        UUID nextId = null;
        String nextDocName = null;
        if (at >= 0 && at < queue.size() - 1) {
            DocumentVersion next = queue.get(at + 1);
            nextId = next.getId();
            ChecklistItem nextItem = next.getChecklistItem();
            if (nextItem != null && nextItem.getDocumentType() != null) {
                String horse = nextItem.getHorse() != null ? nextItem.getHorse().getName() + " · " : "";
                nextDocName = horse + nextItem.getDocumentType().getName();
            } else {
                nextDocName = next.getFile() != null ? next.getFile().getFileName() : "Next document";
            }
        }

        ValidityEngine.Result valResult =
                (item != null && job != null) ? validityEngine.evaluate(item, version, job) : null;
        String autoCheckText = valResult != null ? valResult.note() : "Document present and complete.";
        String autoCheckTone = valResult != null
                ? (valResult.validity() == Validity.GREEN
                        ? "ok"
                        : valResult.validity() == Validity.AMBER ? "warn" : "bad")
                : "ok";

        // The gate's own counts, so "the departure gate still waits for N" agrees with the gate.
        GateAssessment gate = job != null ? assess(job) : null;

        return ClearanceMapper.toReviewDetailResponse(
                version,
                item,
                job,
                allVersions,
                autoCheckText,
                autoCheckTone,
                gate != null ? gate.totalItems() : 0,
                gate != null ? gate.clearedMandatoryItems() : 0,
                gate != null ? gate.mandatoryItems() : 0,
                // 0 when the version has left the queue (already reviewed), so nothing claims a place in it.
                at + 1,
                queue.size(),
                nextId,
                nextDocName);
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
                    issuesText(gate.outstandingIssues()),
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
        reevaluate(job);
        evaluateClearanceGate(jobId);
    }

    /**
     * Re-runs the document check after an incident decision moved the job's dates (US-F5-03, US-F2-10), also once the
     * horses are on the road: each item's validity is evaluated against the new schedule, and a cleared item that no
     * longer holds goes back to review. A moving job's clearance gate isn't re-locked; the items that turned red are
     * returned for the specialist to act on.
     */
    @Transactional
    public List<String> recheckAfterReplan(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        List<String> red = reevaluate(job);
        if (job.getDepartedAt() == null) evaluateClearanceGate(jobId);
        return red;
    }

    /** Evaluates every uploaded item against the job's schedule; returns the items now red, in words. */
    private List<String> reevaluate(TransportJob job) {
        List<String> red = new ArrayList<>();
        for (ChecklistItem item : checklistItemRepository.findByJobId(job.getId())) {
            if (item.getCurrentVersion() != null) {
                ValidityEngine.Result result = validityEngine.evaluate(item, item.getCurrentVersion(), job);
                boolean turnedRed = result.validity() == Validity.RED && item.getValidity() != Validity.RED;
                item.setValidity(result.validity());
                item.setValidityNote(result.note());
                if (result.validity() == Validity.RED && item.getStatus() == ChecklistStatus.CLEARED) {
                    item.setStatus(ChecklistStatus.IN_REVIEW);
                }
                checklistItemRepository.save(item);
                if (turnedRed) {
                    red.add((item.getHorse() == null
                                    ? "Shipment"
                                    : item.getHorse().getName()) + " · "
                            + item.getDocumentType().getName());
                }
            }
        }
        return red;
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

        if (totalMandatory == 0) {
            // #113: with nothing mandatory to check, the gate would hold with nothing checked. It stays closed.
            outstandingIssues.addFirst(destinationVersion(job.getId())
                    .map(v -> "The pinned regulation catalog, "
                            + v.getCatalog().getCountry().getName() + " v"
                            + v.getVersionNo() + ", has no mandatory document rules, so the gate stays closed"
                            + " until the job's checklist has its documents.")
                    .orElse("The job has no document checklist yet. Generate it from the regulation catalogs."));
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
        return jobRegulationPinRepository.findByJobId(jobId).stream()
                .filter(pin -> pin.getRole() == RegulationRole.DESTINATION)
                .map(JobRegulationPin::getRegulationVersion)
                .findFirst();
    }

    private ChecklistItem findChecklistItemOrThrow(UUID checklistItemId) {
        return checklistItemRepository
                .findById(checklistItemId)
                .orElseThrow(() -> ResourceNotFoundException.of("ChecklistItem", checklistItemId));
    }

    /**
     * BR-F2-01: the job's checklist from the published regulation catalogs of the countries on its route. The
     * first run pins the destination's published version (and the origin's, when it is another country with a
     * published catalog); later runs reuse those pins and add only the items that are missing, so a re-run
     * never duplicates an item or undoes a change the specialist made.
     *
     * <p>Each item is due the pinned version's lead time before the planned departure; with no departure
     * planned yet, the due date stays empty until there is one.
     */
    /**
     * Refuses, before anything is written, a request whose job couldn't get its checklist: its destination has no
     * country, or that country has no published regulation catalog to pin (BR-F2-01). Approval calls it first.
     */
    @Transactional(readOnly = true)
    public void requireChecklistSource(TransportRequest request) {
        Country destination = destinationCountry(request);
        if (destination == null) {
            throw new BusinessException(
                    "CHECKLIST_NO_DESTINATION",
                    "The request's destination has no country, so its document checklist can't be made.");
        }
        if (publishedVersion(destination).isEmpty()) {
            throw new BusinessException(
                    "CHECKLIST_NO_CATALOG",
                    "There is no published regulation catalog for " + destination.getName()
                            + ", so the job's document checklist can't be made. Ask the transport specialist to"
                            + " publish one first.");
        }
    }

    @Transactional
    public List<ChecklistItemResponse> generateChecklist(UUID jobId, User specialist) {
        TransportJob job = findJobOrThrow(jobId);
        TransportRequest request = job.getRequest();
        Country destination = destinationCountry(request);
        if (destination == null) {
            throw new BusinessException(
                    "CHECKLIST_NO_DESTINATION",
                    "The job's destination has no country. Set the destination place on the request first.");
        }
        Country origin = request.getOriginPlace() == null
                ? null
                : request.getOriginPlace().getCountry();

        // Validate, then write: the destination must have a published catalog before anything is pinned.
        List<JobRegulationPin> pins = new ArrayList<>(jobRegulationPinRepository.findByJobId(jobId));
        List<JobRegulationPin> newPins = new ArrayList<>();
        if (!isPinned(pins, RegulationRole.DESTINATION)) {
            RegulationVersion version = publishedVersion(destination)
                    .orElseThrow(() -> new BusinessException(
                            "CHECKLIST_NO_CATALOG",
                            "There is no published regulation catalog for " + destination.getName()
                                    + ". Publish one on the Regulations page first."));
            newPins.add(pin(job, version, RegulationRole.DESTINATION));
        }
        if (origin != null && !origin.getId().equals(destination.getId()) && !isPinned(pins, RegulationRole.ORIGIN)) {
            publishedVersion(origin).ifPresent(v -> newPins.add(pin(job, v, RegulationRole.ORIGIN)));
        }
        pins.addAll(jobRegulationPinRepository.saveAll(newPins));

        Map<UUID, RegulationVersion> versionById = new HashMap<>();
        pins.forEach(p -> versionById.put(p.getRegulationVersion().getId(), p.getRegulationVersion()));
        List<RegulationRule> rules = regulationRuleRepository.findByVersionIdIn(versionById.keySet());

        Set<String> existing = new HashSet<>();
        checklistItemRepository
                .findByJobId(jobId)
                .forEach(i -> existing.add(itemKey(
                        i.getDocumentType().getId(),
                        i.getHorse() == null ? null : i.getHorse().getId(),
                        i.getBorderCrossing() == null
                                ? null
                                : i.getBorderCrossing().getId())));
        List<Horse> horses =
                request.getHorses().stream().map(RequestHorse::getHorse).toList();
        List<BorderCrossing> crossings = request.getCorridor() == null
                ? List.of()
                : request.getCorridor().getCrossings().stream()
                        .map(CorridorCrossing::getBorderCrossing)
                        .toList();

        List<ChecklistItem> created = new ArrayList<>();
        for (RegulationRule rule : rules) {
            DocumentType type = rule.getDocumentType();
            LocalDate due = dueDate(job, versionById.get(rule.getVersion().getId()));
            switch (type.getScope()) {
                case PER_HORSE -> horses.forEach(h -> addItem(created, existing, job, rule, due, h, null));
                case PER_SHIPMENT -> addItem(created, existing, job, rule, due, null, null);
                case PER_CROSSING -> crossings.forEach(c -> addItem(created, existing, job, rule, due, null, c));
            }
        }
        checklistItemRepository.saveAll(created);

        if (!created.isEmpty() || !newPins.isEmpty()) {
            evaluateClearanceGate(jobId);
            auditService.recordDecision(
                    specialist,
                    "CHECKLIST_GENERATED",
                    "Generated " + created.size() + " checklist " + (created.size() == 1 ? "item" : "items") + " for "
                            + job.getCode() + " from the pinned regulation catalogs.",
                    "TRANSPORT_JOB",
                    job.getId(),
                    job.getCode(),
                    null,
                    null,
                    null);
        }

        return checklistItemRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toItemResponse)
                .toList();
    }

    /** audit_log.reason holds 500 characters. */
    private static final int REASON_MAX = 500;

    /**
     * The gate's outstanding issues for the audit reason: whole issues while they fit in the column, then
     * "and N more", so a long checklist never fails the gate run that records it.
     */
    static String issuesText(List<String> issues) {
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < issues.size(); i++) {
            String next = (text.isEmpty() ? "" : "; ") + issues.get(i);
            String more = "; and " + (issues.size() - i) + " more";
            boolean last = i == issues.size() - 1;
            if (text.length() + next.length() + (last ? 0 : more.length()) > REASON_MAX) {
                return text.isEmpty() ? issues.size() + " outstanding issues" : text + more;
            }
            text.append(next);
        }
        return text.toString();
    }

    /** The destination place's country, else the country the corridor's last crossing leads into. */
    private static Country destinationCountry(TransportRequest request) {
        if (request.getDestinationPlace() != null
                && request.getDestinationPlace().getCountry() != null) {
            return request.getDestinationPlace().getCountry();
        }
        if (request.getCorridor() == null
                || request.getCorridor().getCrossings().isEmpty()) {
            return null;
        }
        List<CorridorCrossing> crossings = request.getCorridor().getCrossings();
        return crossings.getLast().getBorderCrossing().getToCountry();
    }

    private static boolean isPinned(List<JobRegulationPin> pins, RegulationRole role) {
        return pins.stream().anyMatch(p -> p.getRole() == role);
    }

    private Optional<RegulationVersion> publishedVersion(Country country) {
        return regulationCatalogRepository
                .findByCountryCode(country.getCode())
                .flatMap(c -> regulationVersionRepository.findByCatalogIdAndStatus(c.getId(), CatalogStatus.PUBLISHED));
    }

    private static JobRegulationPin pin(TransportJob job, RegulationVersion version, RegulationRole role) {
        JobRegulationPin pin = new JobRegulationPin();
        pin.setJob(job);
        pin.setRegulationVersion(version);
        pin.setRole(role);
        return pin;
    }

    private static String itemKey(UUID documentTypeId, UUID horseId, UUID crossingId) {
        return documentTypeId + "|" + horseId + "|" + crossingId;
    }

    /** Adds the item unless the job already has one for this document, horse and crossing. */
    private static void addItem(
            List<ChecklistItem> created,
            Set<String> existing,
            TransportJob job,
            RegulationRule rule,
            LocalDate due,
            Horse horse,
            BorderCrossing crossing) {
        DocumentType type = rule.getDocumentType();
        String key =
                itemKey(type.getId(), horse == null ? null : horse.getId(), crossing == null ? null : crossing.getId());
        if (!existing.add(key)) {
            return;
        }
        boolean customerProvides = type.getProvidedBy() == DocumentProvider.CUSTOMER;
        ChecklistItem item = new ChecklistItem();
        item.setJob(job);
        item.setDocumentType(type);
        item.setRegulationRule(rule);
        item.setHorse(horse);
        item.setBorderCrossing(crossing);
        item.setStatus(customerProvides ? ChecklistStatus.AWAITING_UPLOAD : ChecklistStatus.NOT_ISSUED);
        item.setHolder(customerProvides ? ChecklistHolder.CUSTOMER : ChecklistHolder.SPECIALIST);
        item.setDueDate(due);
        created.add(item);
    }

    /** The pinned version's lead time before the planned departure day; empty until a departure is planned. */
    private static LocalDate dueDate(TransportJob job, RegulationVersion version) {
        if (job.getPlannedDepartureAt() == null) {
            return null;
        }
        LocalDate departure =
                job.getPlannedDepartureAt().atZone(AppConstants.BUSINESS_ZONE).toLocalDate();
        return departure.minusDays(version.getLeadTimeDays());
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
