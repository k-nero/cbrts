package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.model.job.*;
import com.equifreight.service.CrewAssignmentService;
import com.equifreight.service.LoadPlanService;
import com.equifreight.service.RoutePlanService;
import com.equifreight.service.TransportJobService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff/jobs")
public class StaffJobController {

    private final TransportJobService transportJobService;
    private final LoadPlanService loadPlanService;
    private final RoutePlanService routePlanService;
    private final CrewAssignmentService crewAssignmentService;

    public StaffJobController(TransportJobService transportJobService,
                              LoadPlanService loadPlanService,
                              RoutePlanService routePlanService,
                              CrewAssignmentService crewAssignmentService) {
        this.transportJobService = transportJobService;
        this.loadPlanService = loadPlanService;
        this.routePlanService = routePlanService;
        this.crewAssignmentService = crewAssignmentService;
    }

    /** US-F3-01: Planning backlog of approved jobs. */
    @GetMapping
    public Page<JobSummaryResponse> list(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "stage", required = false) JobStage stage,
            @RequestParam(value = "filter", required = false) String filter,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return transportJobService.search(q, stage, filter, pageable);
    }

    /** View detailed job workspace with its tabs. */
    @GetMapping("/{id}")
    public JobDetailResponse getDetail(@PathVariable UUID id) {
        return transportJobService.getJobDetail(id);
    }

    /** US-F3-05: Load plan - view current draft or confirmed plan. */
    @GetMapping("/{jobId}/load-plan")
    public LoadPlanResponse getLoadPlan(@PathVariable UUID jobId) {
        return loadPlanService.getOrCreateLoadPlan(jobId);
    }

    /** US-F3-05: Load plan - assign or unassign a horse to a stall. */
    @PostMapping("/{jobId}/load-plan/assign")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public LoadPlanResponse assignStall(@PathVariable UUID jobId, @Valid @RequestBody AssignStallRequest request) {
        return loadPlanService.assignStall(jobId, request.getVehicleStallId(), request.getHorseId());
    }

    /** US-F3-05: Load plan - auto-arrange horses into valid stalls. */
    @PostMapping("/{jobId}/load-plan/auto-arrange")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public LoadPlanResponse autoArrange(@PathVariable UUID jobId) {
        return loadPlanService.autoArrange(jobId);
    }

    /** US-F3-05: Load plan - confirm load plan when zero conflicts exist. */
    @PostMapping("/{jobId}/load-plan/confirm")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public LoadPlanResponse confirmLoadPlan(@PathVariable UUID jobId, @AuthenticationPrincipal User user) {
        return loadPlanService.confirmLoadPlan(jobId, user);
    }

    /** US-F3-03: Route plans - list version history. */
    @GetMapping("/{jobId}/route-plans")
    public List<RoutePlanResponse> getRoutePlans(@PathVariable UUID jobId) {
        return routePlanService.getRoutePlans(jobId);
    }

    /** US-F3-03: Route plans - create or update draft. */
    @PostMapping("/{jobId}/route-plans")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public RoutePlanResponse createRoutePlan(@PathVariable UUID jobId,
                                             @Valid @RequestBody CreateRoutePlanRequest request,
                                             @AuthenticationPrincipal User user) {
        return routePlanService.createOrUpdateDraft(jobId, request, user);
    }

    /** US-F3-03 / US-F3-08: Confirm route plan with optional change reason. */
    @PostMapping("/{jobId}/route-plans/{planId}/confirm")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public RoutePlanResponse confirmRoutePlan(@PathVariable UUID jobId,
                                             @PathVariable UUID planId,
                                             @RequestParam(value = "changeReason", required = false) String changeReason,
                                             @AuthenticationPrincipal User user) {
        return routePlanService.confirmRoutePlan(jobId, planId, changeReason, user);
    }

    /** US-F3-06: Crew assignment - view assigned crew. */
    @GetMapping("/{jobId}/crew")
    public List<CrewMemberResponse> getCrew(@PathVariable UUID jobId) {
        return crewAssignmentService.getCrew(jobId);
    }

    /** US-F3-06: Crew assignment - assign crew enforcing groom ratio. */
    @PostMapping("/{jobId}/crew")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<CrewMemberResponse> assignCrew(@PathVariable UUID jobId,
                                               @Valid @RequestBody AssignCrewRequest request,
                                               @AuthenticationPrincipal User user) {
        return crewAssignmentService.assignCrew(jobId, request, user);
    }

    /** US-F3-08: Manager signs off trip plan (route, load, crew). */
    @PostMapping("/{jobId}/sign-off")
    @PreAuthorize("hasAnyRole('LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public JobDetailResponse signOff(@PathVariable UUID jobId, @AuthenticationPrincipal User user) {
        return transportJobService.signOffTripPlan(jobId, user);
    }
}
