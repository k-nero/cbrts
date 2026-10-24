package com.equifreight.controller;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.model.incident.AddIncidentOptionRequest;
import com.equifreight.model.incident.DecideIncidentRequest;
import com.equifreight.model.incident.DelayAlertRequest;
import com.equifreight.model.incident.IncidentResponse;
import com.equifreight.model.incident.IncidentSummaryResponse;
import com.equifreight.model.incident.JobIncidentResponse;
import com.equifreight.model.incident.ProposeOptionRequest;
import com.equifreight.model.incident.RaiseIncidentRequest;
import com.equifreight.model.incident.ResolveIncidentRequest;
import com.equifreight.model.incident.ReturnProposalRequest;
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

    /** US-F5-02: record an option for handling the incident, with its cost and delay. */
    @PostMapping("/api/v1/staff/incidents/{id}/options")
    @PreAuthorize("hasAnyRole('LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public IncidentResponse addOption(
            @PathVariable UUID id,
            @Valid @RequestBody AddIncidentOptionRequest request,
            @AuthenticationPrincipal User user) {
        return incidents.addOption(id, request, user);
    }

    @DeleteMapping("/api/v1/staff/incidents/{id}/options/{optionId}")
    @PreAuthorize("hasAnyRole('LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public IncidentResponse removeOption(
            @PathVariable UUID id, @PathVariable UUID optionId, @AuthenticationPrincipal User user) {
        return incidents.removeOption(id, optionId, user);
    }

    /** US-F5-02: propose one option for the logistics manager's approval. */
    @PostMapping("/api/v1/staff/incidents/{id}/proposal")
    @PreAuthorize("hasAnyRole('LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public IncidentResponse propose(
            @PathVariable UUID id,
            @Valid @RequestBody ProposeOptionRequest request,
            @AuthenticationPrincipal User user) {
        return incidents.propose(id, request, user);
    }

    /** US-F5-03: the logistics manager approves the proposed option. */
    @PostMapping("/api/v1/staff/incidents/{id}/decision")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public IncidentResponse decide(
            @PathVariable UUID id,
            @Valid @RequestBody DecideIncidentRequest request,
            @AuthenticationPrincipal User user) {
        return incidents.decide(id, request, user);
    }

    /** US-F5-03: the logistics manager sends the proposal back, saying why. */
    @PostMapping("/api/v1/staff/incidents/{id}/proposal/return")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public IncidentResponse returnProposal(
            @PathVariable UUID id,
            @Valid @RequestBody ReturnProposalRequest request,
            @AuthenticationPrincipal User user) {
        return incidents.returnProposal(id, request, user);
    }

    /** US-F5-04: a delay alert on a job on the road, with its new arrival, for the crew and the customers. */
    @PostMapping("/api/v1/staff/jobs/{jobId}/delay-alerts")
    @PreAuthorize("hasAnyRole('LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public IncidentResponse sendDelayAlert(
            @PathVariable UUID jobId,
            @Valid @RequestBody DelayAlertRequest request,
            @AuthenticationPrincipal User user) {
        return incidents.sendDelayAlert(jobId, request, user);
    }

    /** US-F5-05: the logistics manager closes the incident with its resolution and a closing note. */
    @PostMapping("/api/v1/staff/incidents/{id}/resolution")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public IncidentResponse resolve(
            @PathVariable UUID id,
            @Valid @RequestBody ResolveIncidentRequest request,
            @AuthenticationPrincipal User user) {
        return incidents.resolve(id, request, user);
    }

    /** US-F5-05: the job's incidents with their timelines, on its Trip tab. */
    @GetMapping("/api/v1/staff/jobs/{jobId}/incidents")
    public List<JobIncidentResponse> ofJob(@PathVariable UUID jobId) {
        return incidents.ofJob(jobId);
    }

    @GetMapping("/api/v1/staff/incidents/{id}")
    @PreAuthorize("hasAnyRole('LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public IncidentResponse get(@PathVariable UUID id) {
        return incidents.get(id);
    }
}
