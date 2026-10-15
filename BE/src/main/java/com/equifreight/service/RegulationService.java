package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.*;
import com.equifreight.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class RegulationService {

    private final RegulationCatalogRepository catalogRepository;
    private final RegulationVersionRepository versionRepository;
    private final RegulationRuleRepository ruleRepository;
    private final DocumentTypeRepository documentTypeRepository;

    public RegulationService(
            RegulationCatalogRepository catalogRepository,
            RegulationVersionRepository versionRepository,
            RegulationRuleRepository ruleRepository,
            DocumentTypeRepository documentTypeRepository) {
        this.catalogRepository = catalogRepository;
        this.versionRepository = versionRepository;
        this.ruleRepository = ruleRepository;
        this.documentTypeRepository = documentTypeRepository;
    }

    /** Lấy danh mục quy định y tế & kiểm dịch của các quốc gia. */
    @Transactional(readOnly = true)
    public List<RegulationCatalogResponse> listCatalogs() {
        return catalogRepository.findAll().stream()
                .map(cat -> {
                    List<RegulationVersion> published = versionRepository
                            .findByCatalogIdAndStatusOrdered(cat.getId(), CatalogStatus.PUBLISHED);
                    RegulationVersion active = published.isEmpty() ? null : published.get(0);
                    return RegulationCatalogResponse.builder()
                            .id(cat.getId())
                            .countryCode(cat.getCountry() != null ? cat.getCountry().getCode() : null)
                            .name(cat.getName())
                            .activeVersion(active != null ? ClearanceMapper.toVersionResponse(active) : null)
                            .build();
                })
                .toList();
    }

    /** Lấy chi tiết phiên bản quy định kèm các quy tắc giấy tờ. */
    @Transactional(readOnly = true)
    public RegulationVersionResponse getVersionDetails(UUID versionId) {
        RegulationVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> ResourceNotFoundException.of("RegulationVersion", versionId));

        List<RegulationRuleResponse> rules = ruleRepository.findByVersionId(versionId).stream()
                .map(ClearanceMapper::toRuleResponse)
                .toList();

        RegulationVersionResponse resp = ClearanceMapper.toVersionResponse(version);
        resp.setRules(rules);
        return resp;
    }

    /** Lấy danh sách các loại tài liệu trong hệ thống. */
    @Transactional(readOnly = true)
    public List<DocumentTypeResponse> listDocumentTypes() {
        return documentTypeRepository.findAll().stream()
                .map(ClearanceMapper::toDocumentTypeResponse)
                .toList();
    }

    /** Xuất bản một phiên bản quy định mới (chuyển từ DRAFT -> PUBLISHED). */
    @Transactional
    public RegulationVersionResponse publishVersion(UUID versionId, User publisher) {
        assertSpecialist(publisher);
        RegulationVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> ResourceNotFoundException.of("RegulationVersion", versionId));

        if (version.getStatus() != CatalogStatus.DRAFT) {
            throw new BusinessException("Chỉ có thể xuất bản phiên bản đang ở trạng thái DRAFT.");
        }

        // Đánh dấu các bản PUBLISHED trước đó thành RETIRED
        List<RegulationVersion> activeVersions = versionRepository
                .findByCatalogIdAndStatusOrdered(version.getCatalog().getId(), CatalogStatus.PUBLISHED);
        for (RegulationVersion v : activeVersions) {
            v.setStatus(CatalogStatus.RETIRED);
            versionRepository.save(v);
        }

        version.setStatus(CatalogStatus.PUBLISHED);
        version.setPublishedAt(Instant.now());
        version.setPublishedBy(publisher);

        RegulationVersion saved = versionRepository.save(version);
        return getVersionDetails(saved.getId());
    }

    private void assertSpecialist(User user) {
        if (user == null || user.getRoles() == null) {
            throw new BusinessException("Yêu cầu đăng nhập.");
        }
        boolean hasPerm = user.getRoles().stream()
                .map(Role::getName)
                .anyMatch(r -> RoleName.TRANSPORT_SPECIALIST.equals(r) || RoleName.LOGISTICS_MANAGER.equals(r));
        if (!hasPerm) {
            throw new BusinessException("Chỉ Chuyên viên thủ tục hoặc Quản lý Logistics mới có quyền thực hiện.");
        }
    }
}
