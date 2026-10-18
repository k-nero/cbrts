package com.equifreight.controller.customer;

import com.equifreight.entity.User;
import com.equifreight.model.clearance.ChecklistItemResponse;
import com.equifreight.model.clearance.DocumentUploadRequest;
import com.equifreight.service.ClearanceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Customer clearance dossier endpoints (US-F2-03).
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

    @PostMapping("/checklist/{checklistItemId}/versions")
    public ResponseEntity<ChecklistItemResponse> uploadDocumentVersion(
            @PathVariable UUID checklistItemId,
            @Valid @RequestBody DocumentUploadRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clearanceService.uploadCustomerDocumentVersion(checklistItemId, request, user));
    }
}
