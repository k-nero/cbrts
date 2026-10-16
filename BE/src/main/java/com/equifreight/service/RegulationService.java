package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.model.clearance.*;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Service managing country health, quarantine, and customs regulation catalogs (AGENTS.md).
 * Catalogs are maintained and published exclusively by Transport Specialists.
 */
@Service
public class RegulationService {

    private final RegulationCatalogRepository catalogRepository;
    private final RegulationVersionRepository versionRepository;
    private final RegulationRuleRepository ruleRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final AuditService auditService;

    public RegulationService(
            RegulationCatalogRepository catalogRepository,
            RegulationVersionRepository versionRepository,
            RegulationRuleRepository ruleRepository,
            DocumentTypeRepository documentTypeRepository,
            AuditService auditService) {
        this.catalogRepository = catalogRepository;
        this.versionRepository = versionRepository;
        this.ruleRepository = ruleRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.auditService = auditService;
    }

    /** List all regulation catalogs by country with their current active published version. */
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

    /** Get detailed information for a regulation version, including all document rules. */
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

    /** List all recognized document types in the system. */
    @Transactional(readOnly = true)
    public List<DocumentTypeResponse> listDocumentTypes() {
        return documentTypeRepository.findAll().stream()
                .map(ClearanceMapper::toDocumentTypeResponse)
                .toList();
    }

    /**
     * Publish a draft regulation version (DRAFT -> PUBLISHED).
     * Retires the previously active published version and writes an audit log entry.
     */
    @Transactional
    public RegulationVersionResponse publishVersion(UUID versionId, User publisher) {
        assertSpecialist(publisher);
        RegulationVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> ResourceNotFoundException.of("RegulationVersion", versionId));

        if (version.getStatus() != CatalogStatus.DRAFT) {
            throw new BusinessException("Only draft regulation versions can be published.");
        }

        // Retire previously published versions for this catalog
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

        // Record audit decision (BR-F1-08)
        String catalogName = version.getCatalog() != null ? version.getCatalog().getName() : "Regulation Catalog";
        auditService.recordDecision(
                publisher,
                "CATALOG_PUBLISHED",
                String.format("Published %s version %d.", catalogName, version.getVersionNo()),
                "REGULATION_VERSION",
                saved.getId(),
                "CATALOG-" + version.getVersionNo(),
                null,
                "DRAFT",
                "PUBLISHED");

        return getVersionDetails(saved.getId());
    }

    private void assertSpecialist(User user) {
        if (user == null || user.getRoles() == null) {
            throw new UnauthorizedException("Authentication is required.");
        }
        boolean hasPerm = user.getRoles().stream()
                .map(Role::getName)
                .anyMatch(RoleName.TRANSPORT_SPECIALIST::equals);
        if (!hasPerm) {
            throw new UnauthorizedException("Only Transport Specialists are authorized to manage regulation catalogs.");
        }
    }
}
