package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.model.job.*;
import com.equifreight.model.trip.TripPartResponse;
import com.equifreight.service.CrewAssignmentService;
import com.equifreight.service.FlightService;
import com.equifreight.service.JourneyDrafter;
import com.equifreight.service.JourneyService;
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
    private final FlightService flightService;
    private final JourneyService journeyService;
    private final JourneyDrafter journeyDrafter;

    public StaffJobController(
            TransportJobService transportJobService,
            LoadPlanService loadPlanService,
            RoutePlanService routePlanService,
            CrewAssignmentService crewAssignmentService,
            TripSharingService tripSharingService,
            FlightService flightService,
            JourneyService journeyService,
            JourneyDrafter journeyDrafter) {
        this.transportJobService = transportJobService;
        this.loadPlanService = loadPlanService;
        this.routePlanService = routePlanService;
        this.crewAssignmentService = crewAssignmentService;
        this.tripSharingService = tripSharingService;
        this.flightService = flightService;
        this.journeyService = journeyService;
        this.journeyDrafter = journeyDrafter;
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
     * View detailed job workspace with its tabs. Every planning endpoint below takes an optional {@code trip}: one
     * trip of the job's chain (US-F3-16), the job's current trip when left out.
     */
    @GetMapping("/{id}")
    public JobDetailResponse getDetail(
            @PathVariable UUID id, @RequestParam(value = "trip", required = false) UUID trip) {
        return transportJobService.getJobDetail(id, trip);
    }

    /**
     * US-F3-05: Load plan - view current draft or confirmed plan (null if not yet created).
     */
    @GetMapping("/{jobId}/load-plan")
    public TripLoadResponse getLoadPlan(
            @PathVariable UUID jobId, @RequestParam(value = "trip", required = false) UUID trip) {
        return loadPlanService.getActiveLoadPlan(jobId, trip).orElse(null);
    }

    /**
     * US-F3-05: Load plan - explicitly create load plan with selected vehicle.
     */
    @PostMapping("/{jobId}/load-plan")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse createLoadPlan(
            @PathVariable UUID jobId,
            @RequestParam(value = "vehicleId", required = false) UUID vehicleId,
            @RequestParam(value = "trip", required = false) UUID trip) {
        return loadPlanService.createLoadPlan(jobId, trip, vehicleId);
    }

    /**
     * US-F3-05: Load plan - change vehicle for draft load plan.
     */
    @PutMapping("/{jobId}/load-plan/vehicle")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse changeVehicle(
            @PathVariable UUID jobId,
            @RequestParam("vehicleId") UUID vehicleId,
            @RequestParam(value = "tripVehicleId", required = false) UUID tripVehicleId,
            @RequestParam(value = "trip", required = false) UUID trip) {
        return loadPlanService.changeLoadPlanVehicle(jobId, trip, tripVehicleId, vehicleId);
    }

    /**
     * US-F3-10: Convoy - add a trailer to the trip; reopens the trip's plans and clears the sign-off.
     */
    @PostMapping("/{jobId}/load-plan/vehicles")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse addVehicle(
            @PathVariable UUID jobId,
            @RequestParam("vehicleId") UUID vehicleId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @AuthenticationPrincipal User user) {
        return loadPlanService.addVehicle(jobId, trip, vehicleId, user);
    }

    /**
     * US-F3-10: Convoy - take a trailer out of the trip, with its placements, crew and booking.
     */
    @DeleteMapping("/{jobId}/load-plan/vehicles/{tripVehicleId}")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse removeVehicle(
            @PathVariable UUID jobId,
            @PathVariable UUID tripVehicleId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @AuthenticationPrincipal User user) {
        return loadPlanService.removeVehicle(jobId, trip, tripVehicleId, user);
    }

    /**
     * US-F3-05: Load plan - assign or unassign a horse to a stall.
     */
    @PostMapping("/{jobId}/load-plan/assign")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse assignStall(
            @PathVariable UUID jobId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @Valid @RequestBody AssignStallRequest request) {
        return loadPlanService.assignStall(jobId, trip, request.vehicleStallId(), request.horseId());
    }

    /**
     * US-F3-05: Load plan - move, swap or unload one horse (drag and drop). Refused with 409 when
     * the plan no longer matches what the coordinator saw.
     */
    @PostMapping("/{jobId}/load-plan/move")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse moveHorse(
            @PathVariable UUID jobId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @Valid @RequestBody MoveHorseRequest request) {
        return loadPlanService.moveHorse(jobId, trip, request);
    }

    /**
     * US-F3-05: Load plan - auto-arrange horses into valid stalls.
     */
    @PostMapping("/{jobId}/load-plan/auto-arrange")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse autoArrange(
            @PathVariable UUID jobId, @RequestParam(value = "trip", required = false) UUID trip) {
        return loadPlanService.autoArrange(jobId, trip);
    }

    /**
     * US-F3-05: Load plan - confirm load plan when zero conflicts exist.
     */
    @PostMapping("/{jobId}/load-plan/confirm")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripLoadResponse confirmLoadPlan(
            @PathVariable UUID jobId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @RequestBody(required = false) ConfirmLoadPlanRequest request,
            @AuthenticationPrincipal User user) {
        return loadPlanService.confirmLoadPlan(
                jobId, trip, request == null ? List.of() : request.acceptedWarnings(), user);
    }

    /**
     * US-F3-13: Shared trailer - approved jobs that could share this job's trailer: same corridor, shared trailer, a
     * common departure day and room, with the proposed departure, stalls left and biosecurity warnings. Nothing
     * combines until one is chosen.
     */
    @GetMapping("/{jobId}/trip/suggestions")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<ShareSuggestionResponse> shareSuggestions(
            @PathVariable UUID jobId, @RequestParam(value = "trip", required = false) UUID trip) {
        return tripSharingService.suggestions(jobId, trip);
    }

    /**
     * US-F3-12: Biosecurity warnings for this job's trip: if {@code withJobId} joined it, or as its trailers are
     * loaded now. They don't block; the coordinator accepts them when sharing or confirming.
     */
    @GetMapping("/{jobId}/trip/warnings")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<BiosecurityWarningResponse> tripWarnings(
            @PathVariable UUID jobId,
            @RequestParam(value = "withJobId", required = false) UUID withJobId,
            @RequestParam(value = "trip", required = false) UUID trip) {
        return tripSharingService.warnings(jobId, trip, withJobId);
    }

    /**
     * US-F3-11: Shared trailer - put another job on this job's trip; reopens the trips' plans.
     */
    @PostMapping("/{jobId}/trip/jobs")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public ShareTripResponse shareTrip(
            @PathVariable UUID jobId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @Valid @RequestBody ShareTripRequest request,
            @AuthenticationPrincipal User user) {
        return tripSharingService.share(jobId, trip, request.jobId(), request.acceptedWarnings(), user);
    }

    /**
     * US-F3-11: Shared trailer - take a job off this job's trip onto a trip of its own, before departure.
     */
    @DeleteMapping("/{jobId}/trip/jobs/{otherJobId}")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripJobResponse takeOffTrip(
            @PathVariable UUID jobId,
            @PathVariable UUID otherJobId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @AuthenticationPrincipal User user) {
        return tripSharingService.takeOff(jobId, trip, otherJobId, user);
    }

    /**
     * US-F3-18: Confirmed trips this job's trip could join: same corridor, route confirmed, not departed, and every
     * check of joining passed, with each trip's clearance state and the warnings to accept.
     */
    @GetMapping("/{jobId}/trip/joinable")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<JoinableTripResponse> joinableTrips(
            @PathVariable UUID jobId, @RequestParam(value = "trip", required = false) UUID trip) {
        return tripSharingService.joinable(jobId, trip);
    }

    /**
     * US-F3-18: Put this job's trip on a confirmed trip; both trips' plans reopen.
     */
    @PostMapping("/{jobId}/trip/join")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public ShareTripResponse joinTrip(
            @PathVariable UUID jobId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @Valid @RequestBody JoinTripRequest request,
            @AuthenticationPrincipal User user) {
        return tripSharingService.join(jobId, trip, request.tripId(), request.acceptedWarnings(), user);
    }

    /**
     * US-F3-21: The corridors the next trip of the job's journey can run, read from the city the journey has reached.
     */
    @GetMapping("/{jobId}/journey/corridors")
    public List<JourneyCorridorResponse> nextCorridors(@PathVariable UUID jobId) {
        return journeyService.nextCorridors(jobId);
    }

    /**
     * US-F3-22: Draft the job's journey from its quoted route for the coordinator to review: a trip per corridor, and
     * each road route drafted and timed. Refused once the job has a trip.
     */
    @PostMapping("/{jobId}/journey/draft")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<TripPartResponse> draftJourney(@PathVariable UUID jobId, @AuthenticationPrincipal User user) {
        return journeyDrafter.draft(jobId, user);
    }

    /**
     * US-F3-21: Add a trip on a catalog corridor to the end of the job's journey; approval makes none.
     */
    @PostMapping("/{jobId}/journey/trips")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<TripPartResponse> addTrip(
            @PathVariable UUID jobId, @Valid @RequestBody AddTripRequest request, @AuthenticationPrincipal User user) {
        return journeyService.addTrip(jobId, request.corridorId(), user);
    }

    /**
     * US-F3-21: Take the last trip off the job's journey before it departs; the only trip leaves the job with none.
     */
    @DeleteMapping("/{jobId}/journey/trips/{tripId}")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<TripPartResponse> removeTrip(
            @PathVariable UUID jobId, @PathVariable UUID tripId, @AuthenticationPrincipal User user) {
        return journeyService.removeTrip(jobId, tripId, user);
    }

    /**
     * US-F3-21: Set the flight of a flight trip of the journey; its times become the airport stops' times.
     */
    @PutMapping("/{jobId}/journey/trips/{tripId}/flight")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public JobDetailResponse setFlight(
            @PathVariable UUID jobId,
            @PathVariable UUID tripId,
            @Valid @RequestBody SetFlightRequest request,
            @AuthenticationPrincipal User user) {
        journeyService.setFlight(jobId, tripId, request, user);
        return transportJobService.getJobDetail(jobId, tripId);
    }

    /**
     * US-F3-03: Route plans - list version history.
     */
    @GetMapping("/{jobId}/route-plans")
    public List<RoutePlanResponse> getRoutePlans(
            @PathVariable UUID jobId, @RequestParam(value = "trip", required = false) UUID trip) {
        return routePlanService.getRoutePlans(jobId, trip);
    }

    /**
     * US-F3-03: Route plans - create or update draft.
     */
    @PostMapping("/{jobId}/route-plans")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public RoutePlanResponse createRoutePlan(
            @PathVariable UUID jobId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @Valid @RequestBody CreateRoutePlanRequest request,
            @AuthenticationPrincipal User user) {
        return routePlanService.createOrUpdateDraft(jobId, trip, request, user);
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
            @RequestParam(value = "trip", required = false) UUID trip,
            @AuthenticationPrincipal User user) {
        return routePlanService.confirmRoutePlan(jobId, trip, planId, changeReason, user);
    }

    /**
     * US-F3-06: Crew assignment - view assigned crew.
     */
    @GetMapping("/{jobId}/crew")
    public List<CrewMemberResponse> getCrew(
            @PathVariable UUID jobId, @RequestParam(value = "trip", required = false) UUID trip) {
        return crewAssignmentService.getCrew(jobId, trip);
    }

    /**
     * US-F3-06: Crew assignment - available escorts for drivers and grooms.
     */
    @GetMapping("/crew/candidates")
    public List<CrewCandidateResponse> crewCandidates() {
        return crewAssignmentService.getCandidates();
    }

    /**
     * US-F3-06: Crew assignment - assign crew enforcing groom ratio.
     */
    @PostMapping("/{jobId}/crew")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public List<CrewMemberResponse> assignCrew(
            @PathVariable UUID jobId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @Valid @RequestBody AssignCrewRequest request,
            @AuthenticationPrincipal User user) {
        return crewAssignmentService.assignCrew(jobId, trip, request, user);
    }

    /**
     * US-F3-15: Shared flight - set this job's consignment on its trip's flight: air waybill, stall positions, class.
     */
    @PutMapping("/{jobId}/flights/{flightId}/allocation")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public FlightAllocationResponse updateFlightAllocation(
            @PathVariable UUID jobId,
            @PathVariable UUID flightId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @Valid @RequestBody UpdateFlightAllocationRequest request,
            @AuthenticationPrincipal User user) {
        return JobMapper.toAllocationResponse(flightService.updateAllocation(jobId, trip, flightId, request, user));
    }

    /**
     * US-F3-08: Manager signs off trip plan (route, load, crew). Strictly LOGISTICS_MANAGER.
     */
    @PostMapping("/{jobId}/sign-off")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public JobDetailResponse signOff(
            @PathVariable UUID jobId,
            @RequestParam(value = "trip", required = false) UUID trip,
            @AuthenticationPrincipal User user) {
        return transportJobService.signOffTripPlan(jobId, trip, user);
    }
}
