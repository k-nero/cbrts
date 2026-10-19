package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.rate.*;
import com.equifreight.service.RateCatalogService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Staff controller managing rate catalog versions, corridor pricing, volume breaks,
 * policies, and service classes (AGENTS.md, docs/figma-plugin/src/05-admin.js scrRates).
 * Transport Specialists own and maintain these rates.
 */
@RestController
@RequestMapping("/api/v1/staff/rates")
public class RateCatalogController {

    private final RateCatalogService rateCatalogService;

    public RateCatalogController(RateCatalogService rateCatalogService) {
        this.rateCatalogService = rateCatalogService;
    }

    /**
     * List all transport corridors with modes, distances, versions, and missing rate alerts.
     */
    @GetMapping("/corridors")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public List<RateCorridorSummaryResponse> listCorridors() {
        return rateCatalogService.listCorridors();
    }

    /**
     * Get rate catalog details for a corridor and optional version.
     */
    @GetMapping("/details")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')")
    public RateCatalogDetailResponse getRateCatalogDetails(
            @RequestParam(required = false) UUID corridorId, @RequestParam(required = false) UUID versionId) {
        return rateCatalogService.getRateCatalogDetails(corridorId, versionId);
    }

    /**
     * Create a new draft rate catalog version cloned from the active published version.
     */
    @PostMapping("/draft")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RateCatalogDetailResponse createDraft(@AuthenticationPrincipal User user) {
        return rateCatalogService.createDraft(user);
    }

    /**
     * Discard an existing draft rate catalog version.
     */
    @DeleteMapping("/draft/{versionId}")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public void discardDraft(@PathVariable UUID versionId, @AuthenticationPrincipal User user) {
        rateCatalogService.discardDraft(versionId, user);
    }

    /**
     * Publish a draft rate catalog version (DRAFT -> PUBLISHED).
     */
    @PostMapping("/draft/{versionId}/publish")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RateCatalogDetailResponse publishDraft(@PathVariable UUID versionId, @AuthenticationPrincipal User user) {
        return rateCatalogService.publishDraft(versionId, user);
    }

    /**
     * Update an individual volume break discount percentage in draft.
     */
    @PutMapping("/volume-breaks/{breakId}")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RateVolumeBreakResponse updateVolumeBreak(
            @PathVariable UUID breakId,
            @RequestBody UpdateVolumeBreakRequest request,
            @AuthenticationPrincipal User user) {
        return rateCatalogService.updateVolumeBreak(breakId, request, user);
    }

    /**
     * Update an individual air service class position rate in draft.
     */
    @PutMapping("/service-classes/{classId}")
    @PreAuthorize("hasRole('TRANSPORT_SPECIALIST')")
    public RateServiceClassResponse updateServiceClass(
            @PathVariable UUID classId,
            @RequestBody UpdateServiceClassRequest request,
            @AuthenticationPrincipal User user) {
        return rateCatalogService.updateServiceClass(classId, request, user);
    }
}
