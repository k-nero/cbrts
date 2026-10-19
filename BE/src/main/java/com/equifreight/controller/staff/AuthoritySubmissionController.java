package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.AuthorityKind;
import com.equifreight.model.clearance.*;
import com.equifreight.service.AuthoritySubmissionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for regulatory authority filings and quarantine management (AGENTS.md).
 * Transport Specialist handles filings to government agencies and schedules quarantine periods.
 */
@RestController
@RequestMapping("/api/v1/staff/clearance")
public class AuthoritySubmissionController {

    private final AuthoritySubmissionService submissionService;

    public AuthoritySubmissionController(AuthoritySubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    /**
     * List government authorities filtered optionally by country and agency kind.
     */
    @GetMapping("/authorities")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<AuthorityResponse> listAuthorities(
            @RequestParam(required = false) String countryCode, @RequestParam(required = false) AuthorityKind kind) {
        return submissionService.listAuthorities(countryCode, kind);
    }

    /**
     * List designated quarantine facilities.
     */
    @GetMapping("/quarantine-facilities")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<com.equifreight.model.route.PlaceResponse> listQuarantineFacilities() {
        return submissionService.listQuarantineFacilities();
    }

    /**
     * List all authority submissions filed for a transport job.
     */
    @GetMapping("/jobs/{jobId}/submissions")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<AuthoritySubmissionResponse> getSubmissionsByJob(@PathVariable UUID jobId) {
        return submissionService.getSubmissionsByJob(jobId);
    }

    /**
     * File a new submission with an authority. Transport Specialist only.
     */
    @PostMapping("/jobs/{jobId}/submissions")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public AuthoritySubmissionResponse createSubmission(
            @PathVariable UUID jobId,
            @Valid @RequestBody CreateAuthoritySubmissionRequest request,
            @AuthenticationPrincipal User user) {
        return submissionService.createSubmission(jobId, request, user);
    }

    /**
     * Update an authority submission outcome (APPROVED, REJECTED, INFO_REQUESTED). Transport Specialist only.
     */
    @PutMapping("/submissions/{submissionId}")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public AuthoritySubmissionResponse updateSubmission(
            @PathVariable UUID submissionId,
            @Valid @RequestBody UpdateAuthoritySubmissionRequest request,
            @AuthenticationPrincipal User user) {
        return submissionService.updateSubmission(submissionId, request, user);
    }

    /**
     * List quarantine periods scheduled or completed for a transport job.
     */
    @GetMapping("/jobs/{jobId}/quarantines")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<QuarantinePeriodResponse> listQuarantines(@PathVariable UUID jobId) {
        return submissionService.listQuarantines(jobId);
    }

    /**
     * Schedule a new quarantine period for a horse or job shipment. Transport Specialist only.
     */
    @PostMapping("/jobs/{jobId}/quarantines")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public QuarantinePeriodResponse createQuarantine(
            @PathVariable UUID jobId,
            @Valid @RequestBody CreateQuarantinePeriodRequest request,
            @AuthenticationPrincipal User user) {
        return submissionService.createQuarantine(jobId, request, user);
    }

    /**
     * Confirm completion of a quarantine period. Transport Specialist only.
     */
    @PostMapping("/quarantines/{quarantineId}/complete")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public QuarantinePeriodResponse completeQuarantine(
            @PathVariable UUID quarantineId, @AuthenticationPrincipal User user) {
        return submissionService.completeQuarantine(quarantineId, user);
    }
}
