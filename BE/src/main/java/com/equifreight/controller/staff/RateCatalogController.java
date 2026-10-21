package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.model.rate.DraftResult;
import com.equifreight.model.rate.PublishRequest;
import com.equifreight.model.rate.RateCatalogResponse;
import com.equifreight.model.rate.RateCorridorView;
import com.equifreight.model.rate.RateLineRequest;
import com.equifreight.model.rate.RateVersionResponse;
import com.equifreight.model.rate.ServiceClassRequest;
import com.equifreight.model.rate.VolumeBreakRequest;
import com.equifreight.service.RateCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The rate catalog (US-Q-10, #31). Both the transport specialist and the logistics manager read it; only the
 * transport specialist, who owns the catalogs, changes the draft and publishes it. Writes answer the corridor the
 * page shows ({@code view}).
 */
@RestController
@RequestMapping("/api/v1/staff/rates")
public class RateCatalogController {

    private static final String READ = "hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER')";
    private static final String WRITE = "hasRole('TRANSPORT_SPECIALIST')";

    private final RateCatalogService service;

    public RateCatalogController(RateCatalogService service) {
        this.service = service;
    }

    @Operation(summary = "The rate catalog: its versions, newest first, and the corridors with their missing rates")
    @GetMapping("/catalog")
    @PreAuthorize(READ)
    public RateCatalogResponse catalog() {
        return service.catalog();
    }

    @Operation(summary = "One corridor's rates in one catalog version")
    @GetMapping("/versions/{versionId}")
    @PreAuthorize(READ)
    public RateCorridorView corridorView(@PathVariable UUID versionId, @RequestParam UUID corridorId) {
        return service.corridorView(versionId, corridorId);
    }

    @Operation(summary = "Create the draft from the current version (201), or return the open draft (200)")
    @PostMapping("/draft")
    @PreAuthorize(WRITE)
    public ResponseEntity<RateVersionResponse> createDraft(@AuthenticationPrincipal User user) {
        DraftResult result = service.createDraft(user);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.version());
    }

    @Operation(summary = "Discard the draft")
    @DeleteMapping("/draft")
    @PreAuthorize(WRITE)
    public ResponseEntity<Void> discardDraft(@AuthenticationPrincipal User user) {
        service.discardDraft(user);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Set an air stall class's width per horse and position rate in the draft")
    @PutMapping("/draft/corridors/{corridorId}/service-classes/{serviceClass}")
    @PreAuthorize(WRITE)
    public RateCorridorView putServiceClass(
            @PathVariable UUID corridorId,
            @PathVariable ServiceClass serviceClass,
            @Valid @RequestBody ServiceClassRequest body,
            @AuthenticationPrincipal User user) {
        return service.putServiceClass(user, corridorId, serviceClass, body);
    }

    @Operation(summary = "Remove an air stall class from the draft")
    @DeleteMapping("/draft/corridors/{corridorId}/service-classes/{serviceClass}")
    @PreAuthorize(WRITE)
    public RateCorridorView deleteServiceClass(
            @PathVariable UUID corridorId,
            @PathVariable ServiceClass serviceClass,
            @AuthenticationPrincipal User user) {
        return service.deleteServiceClass(user, corridorId, serviceClass);
    }

    @Operation(summary = "Add a catalog line to the draft")
    @PostMapping("/draft/lines")
    @PreAuthorize(WRITE)
    public RateCorridorView addLine(
            @Valid @RequestBody RateLineRequest body,
            @RequestParam(required = false) UUID view,
            @AuthenticationPrincipal User user) {
        return service.addLine(user, body, view);
    }

    @Operation(summary = "Change a catalog line in the draft")
    @PutMapping("/draft/lines/{lineId}")
    @PreAuthorize(WRITE)
    public RateCorridorView updateLine(
            @PathVariable UUID lineId,
            @Valid @RequestBody RateLineRequest body,
            @RequestParam(required = false) UUID view,
            @AuthenticationPrincipal User user) {
        return service.updateLine(user, lineId, body, view);
    }

    @Operation(summary = "Remove a catalog line from the draft")
    @DeleteMapping("/draft/lines/{lineId}")
    @PreAuthorize(WRITE)
    public RateCorridorView deleteLine(
            @PathVariable UUID lineId, @RequestParam UUID view, @AuthenticationPrincipal User user) {
        return service.deleteLine(user, lineId, view);
    }

    @Operation(summary = "Replace a corridor's own volume breaks, or with no corridor the global ones")
    @PutMapping("/draft/volume-breaks")
    @PreAuthorize(WRITE)
    public RateCorridorView putVolumeBreaks(
            @RequestParam(required = false) UUID corridorId,
            @RequestParam UUID view,
            @RequestBody List<VolumeBreakRequest> body,
            @AuthenticationPrincipal User user) {
        return service.putVolumeBreaks(user, corridorId, body, view);
    }

    @Operation(summary = "Set percentage and policy values in the draft")
    @PutMapping("/draft/policies")
    @PreAuthorize(WRITE)
    public RateCorridorView putPolicies(
            @RequestParam UUID view,
            @RequestBody Map<RatePolicyKey, BigDecimal> body,
            @AuthenticationPrincipal User user) {
        return service.putPolicies(user, body, view);
    }

    @Operation(summary = "Publish the draft as the current version; the previous one is retired")
    @PostMapping("/draft/publish")
    @PreAuthorize(WRITE)
    public RateVersionResponse publish(@RequestBody PublishRequest body, @AuthenticationPrincipal User user) {
        return service.publish(user, body);
    }
}
