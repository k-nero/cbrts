package com.equifreight.controller;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.model.incident.IncidentResponse;
import com.equifreight.model.incident.IncidentSummaryResponse;
import com.equifreight.model.incident.RaiseIncidentRequest;
import com.equifreight.service.IncidentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Incidents (Flow 5): reported from the cab, handled by the logistics manager with the coordinator. */
@RestController
public class IncidentController {

    private final IncidentService incidents;

    public IncidentController(IncidentService incidents) {
        this.incidents = incidents;
    }

    /** US-F5-01: the escort reports an emergency on the trip they crew. */
    @PostMapping("/api/v1/escort/trips/{jobCode}/incidents")
    @PreAuthorize("hasRole('ESCORT')")
    public IncidentResponse raise(
            @PathVariable String jobCode,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody RaiseIncidentRequest request) {
        return incidents.raiseFromCab(jobCode, user, request);
    }

    /** The incidents, newest first; {@code status} narrows the list (Open, Decided, Resolved). */
    @GetMapping("/api/v1/staff/incidents")
    @PreAuthorize("hasAnyRole('LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public Page<IncidentSummaryResponse> list(
            @RequestParam(required = false) List<IncidentStatus> status,
            @PageableDefault(size = 20) Pageable pageable) {
        return incidents.list(
                status,
                PageRequest.of(
                        pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "openedAt")));
    }

    @GetMapping("/api/v1/staff/incidents/{id}")
    @PreAuthorize("hasAnyRole('LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public IncidentResponse get(@PathVariable UUID id) {
        return incidents.get(id);
    }
}
