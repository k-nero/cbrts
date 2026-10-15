package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.clearance.*;
import com.equifreight.service.ClearanceService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Flow 2: Luồng Quản lý Hồ sơ Pháp lý & Kiểm dịch Thông quan.
 * Chuyên viên Thủ tục & Kiểm dịch (Transport Specialist) và các vai trò vận hành liên quan.
 */
@RestController
@RequestMapping("/api/v1/staff/clearance")
public class ClearanceController {

    private final ClearanceService clearanceService;

    public ClearanceController(ClearanceService clearanceService) {
        this.clearanceService = clearanceService;
    }

    /** Lấy toàn bộ danh sách checklist hồ sơ theo Job. */
    @GetMapping("/jobs/{jobId}/checklist")
    public List<ChecklistItemResponse> getChecklist(@PathVariable UUID jobId) {
        return clearanceService.getChecklist(jobId);
    }

    /** Xem trạng thái cổng thông quan (Clearance Gate) của Job. */
    @GetMapping("/jobs/{jobId}/status")
    public ClearanceStatusResponse getClearanceStatus(@PathVariable UUID jobId) {
        return clearanceService.getClearanceStatus(jobId);
    }

    /** Hộp thư kiểm duyệt: Danh sách các phiên bản tài liệu đang chờ duyệt (review = PENDING). */
    @GetMapping("/pending-reviews")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<DocumentVersionResponse> getPendingReviews() {
        return clearanceService.getPendingReviews();
    }

    /** Tải lên một phiên bản tài liệu mới cho một mục checklist (Append-only). */
    @PostMapping("/checklist/{checklistItemId}/versions")
    public ChecklistItemResponse uploadDocumentVersion(
            @PathVariable UUID checklistItemId,
            @Valid @RequestBody DocumentUploadRequest request,
            @AuthenticationPrincipal User user) {
        return clearanceService.uploadDocumentVersion(checklistItemId, request, user);
    }

    /** Chuyên viên thẩm định/phê duyệt phiên bản tài liệu (APPROVE / REJECT). */
    @PostMapping("/versions/{documentVersionId}/review")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public DocumentVersionResponse reviewDocument(
            @PathVariable UUID documentVersionId,
            @Valid @RequestBody ReviewDocumentRequest request,
            @AuthenticationPrincipal User user) {
        return clearanceService.reviewDocument(documentVersionId, request, user);
    }

    /** Kích hoạt đánh giá lại cổng thông quan (Clearance Gate) cho chuyến đi. */
    @PostMapping("/jobs/{jobId}/evaluate-gate")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public ClearanceStatusResponse evaluateClearanceGate(@PathVariable UUID jobId) {
        return clearanceService.evaluateClearanceGate(jobId);
    }
}
