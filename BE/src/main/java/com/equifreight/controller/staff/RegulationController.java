package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.clearance.DocumentTypeResponse;
import com.equifreight.model.clearance.RegulationCatalogResponse;
import com.equifreight.model.clearance.RegulationRuleUpdateRequest;
import com.equifreight.model.clearance.RegulationVersionResponse;
import com.equifreight.service.RegulationService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Staff controller managing country regulation catalogs, document types, and rule definitions (AGENTS.md).
 * Transport Specialists own and maintain these catalogs.
 */
@RestController
@RequestMapping("/api/v1/staff/regulations")
public class RegulationController {

    private final RegulationService regulationService;

    public RegulationController(RegulationService regulationService) {
        this.regulationService = regulationService;
    }

    /**
     * List all regulation catalogs by country.
     */
    @GetMapping("/catalogs")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<RegulationCatalogResponse> listCatalogs() {
        return regulationService.listCatalogs();
    }

    /**
     * Get detailed version information and document validation rules.
     */
    @GetMapping("/versions/{versionId}")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public RegulationVersionResponse getVersionDetails(@PathVariable UUID versionId) {
        return regulationService.getVersionDetails(versionId);
    }

    /**
     * List all recognized document types in the system.
     */
    @GetMapping("/document-types")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<DocumentTypeResponse> listDocumentTypes() {
        return regulationService.listDocumentTypes();
    }

    /**
     * Create a new draft regulation version from the active version.
     */
    @PostMapping("/catalogs/{catalogId}/draft")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RegulationVersionResponse createDraft(@PathVariable UUID catalogId, @AuthenticationPrincipal User user) {
        return regulationService.createDraft(catalogId, user);
    }

    /**
     * Update an individual rule within a draft version.
     */
    @PutMapping("/rules/{ruleId}")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RegulationVersionResponse updateRule(
            @PathVariable UUID ruleId,
            @RequestBody RegulationRuleUpdateRequest request,
            @AuthenticationPrincipal User user) {
        return regulationService.updateRule(ruleId, request, user);
    }

    /**
     * Discard an existing draft version.
     */
    @DeleteMapping("/versions/{versionId}")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public void discardDraft(@PathVariable UUID versionId, @AuthenticationPrincipal User user) {
        regulationService.discardDraft(versionId, user);
    }

    /**
     * Publish a new regulation catalog version (DRAFT -> PUBLISHED). Transport Specialist only.
     */
    @PostMapping("/versions/{versionId}/publish")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RegulationVersionResponse publishVersion(@PathVariable UUID versionId, @AuthenticationPrincipal User user) {
        return regulationService.publishVersion(versionId, user);
    }
}
