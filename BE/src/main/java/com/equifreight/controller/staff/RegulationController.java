package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.clearance.CountryRequest;
import com.equifreight.model.clearance.DocumentTypeResponse;
import com.equifreight.model.clearance.RegulationCountryResponse;
import com.equifreight.model.clearance.RegulationParametersRequest;
import com.equifreight.model.clearance.RegulationRuleRequest;
import com.equifreight.model.clearance.RegulationRuleUpdateRequest;
import com.equifreight.model.clearance.RegulationVersionResponse;
import com.equifreight.service.RegulationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Staff controller managing the countries we serve, their regulation catalogs, document types, and rule definitions
 * (AGENTS.md). Transport Specialists own and maintain these catalogs; the Logistics Manager reads them.
 */
@RestController
@RequestMapping("/api/v1/staff/regulations")
public class RegulationController {

    private final RegulationService regulationService;

    public RegulationController(RegulationService regulationService) {
        this.regulationService = regulationService;
    }

    /**
     * Every country we serve, with its regulation catalog or none yet.
     */
    @GetMapping("/countries")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<RegulationCountryResponse> listCountries() {
        return regulationService.listCountries();
    }

    /**
     * Add a country by its ISO 3166-1 alpha-2 code and name (US-F2-12).
     */
    @PostMapping("/countries")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RegulationCountryResponse addCountry(
            @Valid @RequestBody CountryRequest request, @AuthenticationPrincipal User user) {
        return regulationService.addCountry(request, user);
    }

    /**
     * Create a country's regulation catalog with a first draft version (US-F2-12).
     */
    @PostMapping("/countries/{countryId}/catalog")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RegulationVersionResponse createCatalog(
            @PathVariable UUID countryId,
            @Valid @RequestBody RegulationParametersRequest request,
            @AuthenticationPrincipal User user) {
        return regulationService.createCatalog(countryId, request, user);
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
     * Change a draft version's lead times, quarantine minimum and arrival buffer.
     */
    @PutMapping("/versions/{versionId}")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RegulationVersionResponse updateParameters(
            @PathVariable UUID versionId,
            @Valid @RequestBody RegulationParametersRequest request,
            @AuthenticationPrincipal User user) {
        return regulationService.updateParameters(versionId, request, user);
    }

    /**
     * Add a document rule to a draft version.
     */
    @PostMapping("/versions/{versionId}/rules")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RegulationVersionResponse addRule(
            @PathVariable UUID versionId,
            @Valid @RequestBody RegulationRuleRequest request,
            @AuthenticationPrincipal User user) {
        return regulationService.addRule(versionId, request, user);
    }

    /**
     * Update an individual rule within a draft version.
     */
    @PutMapping("/rules/{ruleId}")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RegulationVersionResponse updateRule(
            @PathVariable UUID ruleId,
            @Valid @RequestBody RegulationRuleUpdateRequest request,
            @AuthenticationPrincipal User user) {
        return regulationService.updateRule(ruleId, request, user);
    }

    /**
     * Remove a rule from a draft version.
     */
    @DeleteMapping("/rules/{ruleId}")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RegulationVersionResponse removeRule(@PathVariable UUID ruleId, @AuthenticationPrincipal User user) {
        return regulationService.removeRule(ruleId, user);
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
