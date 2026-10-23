package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.model.clearance.ChecklistItemResponse;
import com.equifreight.model.clearance.DocumentCheckRequest;
import com.equifreight.model.clearance.DocumentCheckResponse;
import com.equifreight.model.clearance.DocumentUploadRequest;
import com.equifreight.model.clearance.DocumentVersionResponse;
import com.equifreight.service.ClearanceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Customer clearance dossier endpoints (US-F2-02, US-F2-03).
 * Enables racing clubs and horse owners to view checklist items and upload documents for their own club's jobs.
 */
@RestController
@RequestMapping("/api/v1/customer/clearance")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerClearanceController {

    private final ClearanceService clearanceService;

    public CustomerClearanceController(ClearanceService clearanceService) {
        this.clearanceService = clearanceService;
    }

    @GetMapping("/jobs/{jobId}/checklist")
    public ResponseEntity<List<ChecklistItemResponse>> getCustomerChecklist(
            @PathVariable UUID jobId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clearanceService.getCustomerChecklist(jobId, user));
    }

    /** US-F2-02: the documents behind a request, for the customer's All documents page. */
    @GetMapping("/requests/{requestId}/checklist")
    public ResponseEntity<List<ChecklistItemResponse>> getRequestChecklist(
            @PathVariable UUID requestId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clearanceService.getCustomerRequestChecklist(requestId, user));
    }

    /** US-F2-03: the automatic check on the dates, before the file is uploaded. Saves nothing. */
    @PostMapping("/checklist/{checklistItemId}/check")
    public ResponseEntity<DocumentCheckResponse> checkDocument(
            @PathVariable UUID checklistItemId,
            @Valid @RequestBody DocumentCheckRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clearanceService.checkCustomerDocument(checklistItemId, request, user));
    }

    /** US-F2-03: every version of the document, newest first. */
    @GetMapping("/checklist/{checklistItemId}/versions")
    public ResponseEntity<List<DocumentVersionResponse>> getVersions(
            @PathVariable UUID checklistItemId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clearanceService.getCustomerVersions(checklistItemId, user));
    }

    @PostMapping("/checklist/{checklistItemId}/versions")
    public ResponseEntity<ChecklistItemResponse> uploadDocumentVersion(
            @PathVariable UUID checklistItemId,
            @Valid @RequestBody DocumentUploadRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clearanceService.uploadCustomerDocumentVersion(checklistItemId, request, user));
    }
}
