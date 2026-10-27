package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.clearance.*;
import com.equifreight.service.CatalogUpdateService;
import com.equifreight.service.ClearanceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Controller handling Transport Specialist clearance operations (AGENTS.md).
 * Strict RBAC enforced: only Transport Specialists may access these review and gate endpoints.
 */
@RestController
@RequestMapping("/api/v1/staff/clearance")
@PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
public class ClearanceController {

    private final ClearanceService clearanceService;
    private final CatalogUpdateService catalogUpdateService;

    public ClearanceController(ClearanceService clearanceService, CatalogUpdateService catalogUpdateService) {
        this.clearanceService = clearanceService;
        this.catalogUpdateService = catalogUpdateService;
    }

    /*
     * Open dossiers (not yet departed), newest first; q matches the job code or the club name.
     */
    @GetMapping("/jobs")
    public Page<JobSummaryResponse> getActiveJobs(
            @RequestParam(value = "q", required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return clearanceService.getActiveJobs(q, pageable);
    }

    @GetMapping("/jobs/{jobId}/checklist")
    public ResponseEntity<List<ChecklistItemResponse>> getChecklist(@PathVariable UUID jobId) {
        return ResponseEntity.ok(clearanceService.getChecklist(jobId));
    }

    @PostMapping("/jobs/{jobId}/generate-checklist")
    public ResponseEntity<List<ChecklistItemResponse>> generateChecklist(
            @PathVariable UUID jobId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clearanceService.generateChecklist(jobId, user));
    }

    /** Newer published versions of the job's pinned catalogs, with what moving onto each would change. */
    @GetMapping("/jobs/{jobId}/catalog-updates")
    public List<CatalogUpdateResponse> getCatalogUpdates(@PathVariable UUID jobId) {
        return catalogUpdateService.updatesFor(jobId);
    }

    /** Moves the job onto a newer published version of one of its catalogs; returns the checklist after the move. */
    @PostMapping("/jobs/{jobId}/catalog-updates")
    public List<ChecklistItemResponse> moveToCatalogVersion(
            @PathVariable UUID jobId,
            @Valid @RequestBody CatalogMoveRequest request,
            @AuthenticationPrincipal User user) {
        return catalogUpdateService.moveToVersion(jobId, request, user);
    }

    @GetMapping("/jobs/{jobId}/status")
    public ResponseEntity<ClearanceStatusResponse> getClearanceStatus(@PathVariable UUID jobId) {
        return ResponseEntity.ok(clearanceService.getClearanceStatus(jobId));
    }

    @PostMapping("/jobs/{jobId}/evaluate-gate")
    public ResponseEntity<ClearanceStatusResponse> evaluateClearanceGate(@PathVariable UUID jobId) {
        return ResponseEntity.ok(clearanceService.evaluateClearanceGate(jobId));
    }

    @GetMapping("/pending-reviews")
    public ResponseEntity<Page<DocumentVersionResponse>> getPendingReviews(
            @PageableDefault(size = 50, sort = "uploadedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(clearanceService.getPendingReviews(pageable));
    }

    @PostMapping("/checklist/{checklistItemId}/versions")
    public ResponseEntity<ChecklistItemResponse> uploadDocumentVersion(
            @PathVariable UUID checklistItemId,
            @Valid @RequestBody DocumentUploadRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clearanceService.uploadDocumentVersion(checklistItemId, request, user));
    }

    @GetMapping("/versions/{documentVersionId}")
    public ResponseEntity<DocumentReviewDetailResponse> getDocumentReviewDetail(@PathVariable UUID documentVersionId) {
        return ResponseEntity.ok(clearanceService.getDocumentReviewDetail(documentVersionId));
    }

    @PostMapping("/versions/{documentVersionId}/review")
    public ResponseEntity<DocumentVersionResponse> reviewDocument(
            @PathVariable UUID documentVersionId,
            @Valid @RequestBody ReviewDocumentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clearanceService.reviewDocument(documentVersionId, request, user));
    }
}
