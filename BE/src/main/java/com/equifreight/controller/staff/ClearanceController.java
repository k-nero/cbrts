package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.clearance.*;
import com.equifreight.service.ClearanceService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Flow 2: Clearance Dossier & Legal Quarantine Controller (AGENTS.md).
 * Transport Specialist endpoints for reviewing documents, evaluating validity, and controlling the clearance gate.
 */
@RestController
@RequestMapping("/api/v1/staff/clearance")
public class ClearanceController {

    private final ClearanceService clearanceService;

    public ClearanceController(ClearanceService clearanceService) {
        this.clearanceService = clearanceService;
    }

    /** Retrieve all checklist items for a job. */
    @GetMapping("/jobs/{jobId}/checklist")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public List<ChecklistItemResponse> getChecklist(@PathVariable UUID jobId) {
        return clearanceService.getChecklist(jobId);
    }

    /** View clearance gate evaluation status of a job. */
    @GetMapping("/jobs/{jobId}/status")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public ClearanceStatusResponse getClearanceStatus(@PathVariable UUID jobId) {
        return clearanceService.getClearanceStatus(jobId);
    }

    /** Transport Specialist pending reviews inbox with pagination. */
    @GetMapping("/pending-reviews")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public Page<DocumentVersionResponse> getPendingReviews(@PageableDefault(size = 20) Pageable pageable) {
        return clearanceService.getPendingReviews(pageable);
    }

    /** Upload a new document version for a checklist item (Append-only). */
    @PostMapping("/checklist/{checklistItemId}/versions")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public ChecklistItemResponse uploadDocumentVersion(
            @PathVariable UUID checklistItemId,
            @Valid @RequestBody DocumentUploadRequest request,
            @AuthenticationPrincipal User user) {
        return clearanceService.uploadDocumentVersion(checklistItemId, request, user);
    }

    /** Transport Specialist reviews a document version (APPROVE / REJECT). */
    @PostMapping("/versions/{documentVersionId}/review")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public DocumentVersionResponse reviewDocument(
            @PathVariable UUID documentVersionId,
            @Valid @RequestBody ReviewDocumentRequest request,
            @AuthenticationPrincipal User user) {
        return clearanceService.reviewDocument(documentVersionId, request, user);
    }

    /** Manually trigger re-evaluation of the Clearance Gate for a job. */
    @PostMapping("/jobs/{jobId}/evaluate-gate")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public ClearanceStatusResponse evaluateClearanceGate(@PathVariable UUID jobId) {
        return clearanceService.evaluateClearanceGate(jobId);
    }
}
