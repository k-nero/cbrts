package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.model.job.*;
import com.equifreight.service.CrewAssignmentService;
import com.equifreight.service.LoadPlanService;
import com.equifreight.service.RoutePlanService;
import com.equifreight.service.TransportJobService;
import com.equifreight.service.TripSharingService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/staff/jobs")
public class StaffJobController {

    private final TransportJobService transportJobService;
    private final LoadPlanService loadPlanService;
    private final RoutePlanService routePlanService;
    private final CrewAssignmentService crewAssignmentService;
    private final TripSharingService tripSharingService;

    public StaffJobController(
            TransportJobService transportJobService,
            LoadPlanService loadPlanService,
            RoutePlanService routePlanService,
            CrewAssignmentService crewAssignmentService,
            TripSharingService tripSharingService) {
        this.transportJobService = transportJobService;
        this.loadPlanService = loadPlanService;
        this.routePlanService = routePlanService;
        this.crewAssignmentService = crewAssignmentService;
        this.tripSharingService = tripSharingService;
    }

    /**
     * US-F3-01: Planning backlog of approved jobs, soonest departure first (jobs without a date last).
     */
    @GetMapping
    public Page<JobSummaryResponse> list(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "stage", required = false) JobStage stage,
            @RequestParam(value = "filter", required = false) String filter,
            @PageableDefault(size = 20, sort = "plannedDepartureAt", direction = Sort.Direction.ASC)
                    Pageable pageable) {
        return transportJobService.search(q, stage, filter, pageable);
    }

    /**
     * View detailed job workspace with its tabs.
     */
    @GetMapping("/{id}")
    public JobDetailResponse getDetail(@PathVariable UUID id) {
        return transportJobService.getJobDetail(id);
    }

    /**
     * US-F3-05: Load plan - view current draft or confirmed plan (null if not yet created).
     */
    @GetMapping("/{jobId}/load-plan")
    public TripLoadResponse getLoadPlan(@PathVariable UUID jobId) {
        return loadPlanService.getActiveLoadPlan(jobId).orElse(null);
    }

    /**
     * US-F3-05: Load plan - explicitly create load plan with selected vehicle.
     */
    @PostMapping("/{jobId}/load-plan")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse createLoadPlan(
            @PathVariable UUID jobId, @RequestParam(value = "vehicleId", required = false) UUID vehicleId) {
        return loadPlanService.createLoadPlan(jobId, vehicleId);
    }

    /**
     * US-F3-05: Load plan - change vehicle for draft load plan.
     */
    @PutMapping("/{jobId}/load-plan/vehicle")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse changeVehicle(
            @PathVariable UUID jobId,
            @RequestParam("vehicleId") UUID vehicleId,
            @RequestParam(value = "tripVehicleId", required = false) UUID tripVehicleId) {
        return loadPlanService.changeLoadPlanVehicle(jobId, tripVehicleId, vehicleId);
    }

    /**
     * US-F3-10: Convoy - add a trailer to the trip; reopens the trip's plans and clears the sign-off.
     */
    @PostMapping("/{jobId}/load-plan/vehicles")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse addVehicle(
            @PathVariable UUID jobId, @RequestParam("vehicleId") UUID vehicleId, @AuthenticationPrincipal User user) {
        return loadPlanService.addVehicle(jobId, vehicleId, user);
    }

    /**
     * US-F3-10: Convoy - take a trailer out of the trip, with its placements, crew and booking.
     */
    @DeleteMapping("/{jobId}/load-plan/vehicles/{tripVehicleId}")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse removeVehicle(
            @PathVariable UUID jobId, @PathVariable UUID tripVehicleId, @AuthenticationPrincipal User user) {
        return loadPlanService.removeVehicle(jobId, tripVehicleId, user);
    }

    /**
     * US-F3-05: Load plan - assign or unassign a horse to a stall.
     */
    @PostMapping("/{jobId}/load-plan/assign")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse assignStall(@PathVariable UUID jobId, @Valid @RequestBody AssignStallRequest request) {
        return loadPlanService.assignStall(jobId, request.vehicleStallId(), request.horseId());
    }

    /**
     * US-F3-05: Load plan - move, swap or unload one horse (drag and drop). Refused with 409 when
     * the plan no longer matches what the coordinator saw.
     */
    @PostMapping("/{jobId}/load-plan/move")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse moveHorse(@PathVariable UUID jobId, @Valid @RequestBody MoveHorseRequest request) {
        return loadPlanService.moveHorse(jobId, request);
    }

    /**
     * US-F3-05: Load plan - auto-arrange horses into valid stalls.
     */
    @PostMapping("/{jobId}/load-plan/auto-arrange")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse autoArrange(@PathVariable UUID jobId) {
        return loadPlanService.autoArrange(jobId);
    }

    /**
     * US-F3-05: Load plan - confirm load plan when zero conflicts exist.
     */
    @PostMapping("/{jobId}/load-plan/confirm")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse confirmLoadPlan(@PathVariable UUID jobId, @AuthenticationPrincipal User user) {
        return loadPlanService.confirmLoadPlan(jobId, user);
    }

    /**
     * US-F3-11: Shared trailer - approved jobs that could join this job's trip (same corridor, shared trailer, not
     * departed). The checks run when one is added.
     */
    @GetMapping("/{jobId}/trip/candidates")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<TripJobResponse> shareCandidates(@PathVariable UUID jobId) {
        return tripSharingService.candidates(jobId);
    }

    /**
     * US-F3-11: Shared trailer - put another job on this job's trip; reopens the trips' plans.
     */
    @PostMapping("/{jobId}/trip/jobs")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public ShareTripResponse shareTrip(
            @PathVariable UUID jobId,
            @Valid @RequestBody ShareTripRequest request,
            @AuthenticationPrincipal User user) {
        return tripSharingService.share(jobId, request.jobId(), user);
    }

    /**
     * US-F3-11: Shared trailer - take a job off this job's trip onto a trip of its own, before departure.
     */
    @DeleteMapping("/{jobId}/trip/jobs/{otherJobId}")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripJobResponse takeOffTrip(
            @PathVariable UUID jobId, @PathVariable UUID otherJobId, @AuthenticationPrincipal User user) {
        return tripSharingService.takeOff(jobId, otherJobId, user);
    }

    /**
     * US-F3-03: Route plans - list version history.
     */
    @GetMapping("/{jobId}/route-plans")
    public List<RoutePlanResponse> getRoutePlans(@PathVariable UUID jobId) {
        return routePlanService.getRoutePlans(jobId);
    }

    /**
     * US-F3-03: Route plans - create or update draft.
     */
    @PostMapping("/{jobId}/route-plans")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public RoutePlanResponse createRoutePlan(
            @PathVariable UUID jobId,
            @Valid @RequestBody CreateRoutePlanRequest request,
            @AuthenticationPrincipal User user) {
        return routePlanService.createOrUpdateDraft(jobId, request, user);
    }

    /**
     * US-F3-03 / US-F3-08: Confirm route plan with optional change reason.
     */
    @PostMapping("/{jobId}/route-plans/{planId}/confirm")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public RoutePlanResponse confirmRoutePlan(
            @PathVariable UUID jobId,
            @PathVariable UUID planId,
            @RequestParam(value = "changeReason", required = false) String changeReason,
            @AuthenticationPrincipal User user) {
        return routePlanService.confirmRoutePlan(jobId, planId, changeReason, user);
    }

    /**
     * US-F3-06: Crew assignment - view assigned crew.
     */
    @GetMapping("/{jobId}/crew")
    public List<CrewMemberResponse> getCrew(@PathVariable UUID jobId) {
        return crewAssignmentService.getCrew(jobId);
    }

    /**
     * US-F3-06: Crew assignment - assign crew enforcing groom ratio.
     */
    @PostMapping("/{jobId}/crew")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<CrewMemberResponse> assignCrew(
            @PathVariable UUID jobId,
            @Valid @RequestBody AssignCrewRequest request,
            @AuthenticationPrincipal User user) {
        return crewAssignmentService.assignCrew(jobId, request, user);
    }

    /**
     * US-F3-08: Manager signs off trip plan (route, load, crew). Strictly LOGISTICS_MANAGER.
     */
    @PostMapping("/{jobId}/sign-off")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public JobDetailResponse signOff(@PathVariable UUID jobId, @AuthenticationPrincipal User user) {
        return transportJobService.signOffTripPlan(jobId, user);
    }
}
