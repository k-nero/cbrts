package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.clearance.DocumentTypeResponse;
import com.equifreight.model.clearance.RegulationCatalogResponse;
import com.equifreight.model.clearance.RegulationVersionResponse;
import com.equifreight.service.RegulationService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller quản lý danh mục quy định y tế, kiểm dịch và hải quan của từng quốc gia/cửa khẩu.
 */
@RestController
@RequestMapping("/api/v1/staff/regulations")
public class RegulationController {

    private final RegulationService regulationService;

    public RegulationController(RegulationService regulationService) {
        this.regulationService = regulationService;
    }

    /** Danh sách danh mục quy định theo quốc gia. */
    @GetMapping("/catalogs")
    public List<RegulationCatalogResponse> listCatalogs() {
        return regulationService.listCatalogs();
    }

    /** Chi tiết phiên bản quy định và các quy tắc kiểm tra giấy tờ. */
    @GetMapping("/versions/{versionId}")
    public RegulationVersionResponse getVersionDetails(@PathVariable UUID versionId) {
        return regulationService.getVersionDetails(versionId);
    }

    /** Danh mục tất cả các loại giấy tờ trong hệ thống. */
    @GetMapping("/document-types")
    public List<DocumentTypeResponse> listDocumentTypes() {
        return regulationService.listDocumentTypes();
    }

    /** Xuất bản phiên bản quy định mới (DRAFT -> PUBLISHED). */
    @PostMapping("/versions/{versionId}/publish")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public RegulationVersionResponse publishVersion(
            @PathVariable UUID versionId,
            @AuthenticationPrincipal User user) {
        return regulationService.publishVersion(versionId, user);
    }
}
