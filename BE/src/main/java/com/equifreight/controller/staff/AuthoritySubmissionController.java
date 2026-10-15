package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.AuthorityKind;
import com.equifreight.model.clearance.*;
import com.equifreight.service.AuthoritySubmissionService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller quản lý nộp hồ sơ tới các cơ quan chức năng & đợt cách ly kiểm dịch.
 */
@RestController
@RequestMapping("/api/v1/staff/clearance")
public class AuthoritySubmissionController {

    private final AuthoritySubmissionService submissionService;

    public AuthoritySubmissionController(AuthoritySubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    /** Danh sách các cơ quan chức năng (Bộ Nông nghiệp, Hải quan, Thú y, Trạm kiểm dịch). */
    @GetMapping("/authorities")
    public List<AuthorityResponse> listAuthorities(
            @RequestParam(required = false) String countryCode,
            @RequestParam(required = false) AuthorityKind kind) {
        return submissionService.listAuthorities(countryCode, kind);
    }

    /** Danh sách các đợt nộp hồ sơ theo chuyến đi. */
    @GetMapping("/jobs/{jobId}/submissions")
    public List<AuthoritySubmissionResponse> getSubmissionsByJob(@PathVariable UUID jobId) {
        return submissionService.getSubmissionsByJob(jobId);
    }

    /** Tạo mới một đợt nộp hồ sơ tới cơ quan thẩm quyền. */
    @PostMapping("/jobs/{jobId}/submissions")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public AuthoritySubmissionResponse createSubmission(
            @PathVariable UUID jobId,
            @Valid @RequestBody CreateAuthoritySubmissionRequest request,
            @AuthenticationPrincipal User user) {
        return submissionService.createSubmission(jobId, request, user);
    }

    /** Cập nhật tiến độ xử lý hồ sơ từ cơ quan thẩm quyền (Được cấp / Bổ sung thông tin / Bị từ chối). */
    @PutMapping("/submissions/{submissionId}")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public AuthoritySubmissionResponse updateSubmission(
            @PathVariable UUID submissionId,
            @Valid @RequestBody UpdateAuthoritySubmissionRequest request,
            @AuthenticationPrincipal User user) {
        return submissionService.updateSubmission(submissionId, request, user);
    }

    /** Danh sách các đợt cách ly kiểm dịch của chuyến đi. */
    @GetMapping("/jobs/{jobId}/quarantines")
    public List<QuarantinePeriodResponse> listQuarantines(@PathVariable UUID jobId) {
        return submissionService.listQuarantines(jobId);
    }

    /** Thiết lập đợt cách ly kiểm dịch mới. */
    @PostMapping("/jobs/{jobId}/quarantines")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public QuarantinePeriodResponse createQuarantine(
            @PathVariable UUID jobId,
            @Valid @RequestBody CreateQuarantinePeriodRequest request,
            @AuthenticationPrincipal User user) {
        return submissionService.createQuarantine(jobId, request, user);
    }

    /** Xác nhận hoàn tất đợt cách ly kiểm dịch. */
    @PostMapping("/quarantines/{quarantineId}/complete")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public QuarantinePeriodResponse completeQuarantine(
            @PathVariable UUID quarantineId,
            @AuthenticationPrincipal User user) {
        return submissionService.completeQuarantine(quarantineId, user);
    }
}
