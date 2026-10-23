package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.*;
import com.equifreight.repository.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.log4j.Log4j2;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * How a trip is loaded (US-F3-05, US-F3-10): one load plan per trailer, and every horse on the trip placed on exactly
 * one of them before the trip's load is confirmed. A horse can move between trailers, so every change takes all the
 * trip's plans under a row lock first.
 */
@Service
@Log4j2
public class LoadPlanService {

    private final LoadPlanRepository loadPlanRepository;
    private final LoadPlanStallRepository loadPlanStallRepository;
    private final TransportJobRepository transportJobRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleStallRepository vehicleStallRepository;
    private final VehicleBookingRepository vehicleBookingRepository;
    private final CrewAssignmentRepository crewAssignmentRepository;
    private final JobTripService jobTrips;
    private final RoutePlanService routePlanService;
    private final BiosecurityService biosecurity;
    private final AuditService auditService;

    public LoadPlanService(
            LoadPlanRepository loadPlanRepository,
            LoadPlanStallRepository loadPlanStallRepository,
            TransportJobRepository transportJobRepository,
            VehicleRepository vehicleRepository,
            VehicleStallRepository vehicleStallRepository,
            VehicleBookingRepository vehicleBookingRepository,
            CrewAssignmentRepository crewAssignmentRepository,
            JobTripService jobTrips,
            RoutePlanService routePlanService,
            BiosecurityService biosecurity,
            AuditService auditService) {
        this.loadPlanRepository = loadPlanRepository;
        this.loadPlanStallRepository = loadPlanStallRepository;
        this.transportJobRepository = transportJobRepository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleStallRepository = vehicleStallRepository;
        this.vehicleBookingRepository = vehicleBookingRepository;
        this.crewAssignmentRepository = crewAssignmentRepository;
        this.jobTrips = jobTrips;
        this.routePlanService = routePlanService;
        this.biosecurity = biosecurity;
        this.auditService = auditService;
    }

    /**
     * The trip's horses, with the mares travelling with a foal at foot and, on a shared trip, the job code each
     * travels under.
     */
    private record Cargo(List<Horse> horses, Set<UUID> maresWithFoal, Map<UUID, String> jobCodes) {
        JobHorseResponse response(Horse h) {
            return jobCodes.isEmpty()
                    ? JobMapper.toHorseResponse(h)
                    : JobMapper.toHorseResponse(h, jobCodes.get(h.getId()));
        }
    }

    /** The job's trip load; empty until a vehicle is chosen. */
    @Transactional(readOnly = true)
    public Optional<TripLoadResponse> getActiveLoadPlan(UUID jobId) {
        TransportJob job = job(jobId);
        return jobTrips.findTripOf(jobId).flatMap(trip -> {
            List<LoadPlan> plans = loadPlanRepository.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId());
            return plans.isEmpty() ? Optional.empty() : Optional.of(buildResponse(trip, plans, job));
        });
    }

    private TransportJob job(UUID jobId) {
        return transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));
    }

    private List<LoadPlan> lockedPlans(Trip trip, UUID jobId) {
        List<LoadPlan> plans = loadPlanRepository.findByTripIdForUpdate(trip.getId());
        if (plans.isEmpty()) throw new ResourceNotFoundException("Load plan not found for job: " + jobId);
        return plans;
    }

    private static Vehicle activeVehicle(Vehicle vehicle, String use) {
        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            throw new BusinessException("Vehicle " + vehicle.getCode() + " is currently in " + vehicle.getStatus()
                    + " and cannot be " + use);
        }
        return vehicle;
    }

    private Vehicle vehicle(UUID vehicleId) {
        return vehicleRepository
                .findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + vehicleId));
    }

    /** Before departure only: after it, a trailer leaves the convoy only through an incident (US-F5-06). */
    private static void requireNotDeparted(TransportJob job, String action) {
        if (job.getDepartedAt() != null || job.getTripStatus() != TripStatus.NOT_STARTED) {
            throw new BusinessException("Cannot " + action
                    + ": the trip has departed. A trailer leaves a moving trip only through an incident.");
        }
    }

    /**
     * Starts the trip's load on {@code vehicleId}, or on the first active vehicle. When the trip has a vehicle
     * already, this changes the first trailer's vehicle instead.
     */
    @Transactional
    public TripLoadResponse createLoadPlan(UUID jobId, UUID vehicleId) {
        TransportJob job = job(jobId);
        Trip trip = jobTrips.tripOf(jobId);
        Vehicle vehicle = vehicleId != null
                ? vehicle(vehicleId)
                : vehicleRepository.findAllByStatus(VehicleStatus.ACTIVE).stream()
                        .findFirst()
                        .orElseThrow(() -> new BusinessException("No active vehicles available to create load plan"));
        activeVehicle(vehicle, "used for load plan");

        Optional<TripVehicle> first = jobTrips.vehicleOf(trip);
        if (first.isPresent()) {
            return changeLoadPlanVehicle(jobId, first.get().getId(), vehicle.getId());
        }
        LoadPlan plan = new LoadPlan();
        plan.setTripVehicle(jobTrips.useVehicle(trip, vehicle));
        plan.setStatus(LoadPlanStatus.DRAFT);
        loadPlanRepository.save(plan);
        return buildResponse(
                trip, loadPlanRepository.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()), job);
    }

    /**
     * Puts another vehicle under one trailer's draft plan ({@code tripVehicleId}, or the first trailer). Its
     * placements are cleared, since the stalls differ; its crew stays.
     */
    @Transactional
    public TripLoadResponse changeLoadPlanVehicle(UUID jobId, UUID tripVehicleId, UUID vehicleId) {
        TransportJob job = job(jobId);
        Trip trip = jobTrips.tripOf(jobId);
        Vehicle vehicle = activeVehicle(vehicle(vehicleId), "used for load plan");
        List<LoadPlan> plans = lockedPlans(trip, jobId);
        LoadPlan plan = tripVehicleId == null ? plans.getFirst() : planOf(plans, tripVehicleId);
        if (!plan.getVehicle().getId().equals(vehicle.getId())) {
            if (plan.getStatus() == LoadPlanStatus.CONFIRMED) {
                throw new BusinessException("Cannot change the vehicle of a CONFIRMED load plan");
            }
            if (plans.stream().anyMatch(p -> p.getVehicle().getId().equals(vehicle.getId()))) {
                throw new BusinessException("Vehicle " + vehicle.getCode() + " is already on this trip");
            }
            loadPlanStallRepository.deleteAllForLoadPlan(plan.getId());
            plan.getTripVehicle().setVehicle(vehicle);
        }
        return buildResponse(trip, plans, job);
    }

    private static LoadPlan planOf(List<LoadPlan> plans, UUID tripVehicleId) {
        return plans.stream()
                .filter(p -> p.getTripVehicle().getId().equals(tripVehicleId))
                .findFirst()
                .orElseThrow(() -> ResourceNotFoundException.of("Trailer on this trip", tripVehicleId));
    }

    /**
     * Adds a trailer to the convoy with an empty draft plan (US-F3-10). The trip's plans reopen: the confirmed load
     * plans go back to draft, the confirmed route is superseded by a new draft version, and the sign-off is cleared.
     */
    @Transactional
    public TripLoadResponse addVehicle(UUID jobId, UUID vehicleId, User currentUser) {
        TransportJob job = job(jobId);
        requireNotDeparted(job, "add a trailer");
        Trip trip = jobTrips.tripOf(jobId);
        Vehicle vehicle = activeVehicle(vehicle(vehicleId), "added to the trip");
        List<LoadPlan> plans = lockedPlans(trip, jobId);

        LoadPlan plan = new LoadPlan();
        plan.setTripVehicle(jobTrips.addVehicle(trip, vehicle));
        plan.setStatus(LoadPlanStatus.DRAFT);
        plans = new ArrayList<>(plans);
        plans.add(loadPlanRepository.save(plan));

        String reason = "Trailer " + vehicle.getCode() + " added to the convoy";
        reopen(trip, plans, reason);
        auditService.recordDecision(
                currentUser,
                "ADD_TRIP_VEHICLE",
                reason + " of trip " + trip.getCode() + " (job " + job.getCode() + ")",
                "TRIP",
                trip.getId(),
                trip.getCode(),
                null,
                null,
                vehicle.getCode());
        return buildResponse(trip, plans, job);
    }

    /**
     * Takes a trailer out of the convoy, with its placements, crew and booking (US-F3-10). The trip keeps at least
     * one trailer, and its plans reopen as when one is added.
     */
    @Transactional
    public TripLoadResponse removeVehicle(UUID jobId, UUID tripVehicleId, User currentUser) {
        TransportJob job = job(jobId);
        requireNotDeparted(job, "remove a trailer");
        Trip trip = jobTrips.tripOf(jobId);
        List<LoadPlan> plans = new ArrayList<>(lockedPlans(trip, jobId));
        LoadPlan plan = planOf(plans, tripVehicleId);
        if (plans.size() == 1) {
            throw new BusinessException("A trip keeps at least one trailer; choose another vehicle instead");
        }
        TripVehicle tripVehicle = plan.getTripVehicle();
        String code = tripVehicle.getVehicle().getCode();

        vehicleBookingRepository
                .findByTrip_IdAndVehicle_Id(
                        trip.getId(), tripVehicle.getVehicle().getId())
                .ifPresent(vehicleBookingRepository::delete);
        loadPlanStallRepository.deleteAllForLoadPlan(plan.getId());
        crewAssignmentRepository.deleteByTripVehicleId(tripVehicle.getId());
        loadPlanRepository.delete(plan);
        loadPlanRepository.flush();
        plans.remove(plan);
        jobTrips.removeVehicle(tripVehicle);

        String reason = "Trailer " + code + " taken out of the convoy";
        reopen(trip, plans, reason);
        auditService.recordDecision(
                currentUser,
                "REMOVE_TRIP_VEHICLE",
                reason + " of trip " + trip.getCode() + " (job " + job.getCode() + ")",
                "TRIP",
                trip.getId(),
                trip.getCode(),
                null,
                code,
                null);
        return buildResponse(trip, plans, job);
    }

    /**
     * Why the trip's trailers can't also carry {@code joining}'s horses (US-F3-11), or null when they can: enough
     * stalls, box stalls for the horses that need a box, climate stalls for the heat-sensitive, and payload. A trip
     * with no vehicle yet has nothing to check.
     */
    @Transactional(readOnly = true)
    public String lackOfRoom(Trip trip, TransportJob joining) {
        List<TripVehicle> trailers = jobTrips.vehiclesOf(trip);
        if (trailers.isEmpty()) return null;
        Cargo cargo = cargo(trip);
        List<Horse> horses = new ArrayList<>(cargo.horses());
        Set<UUID> withFoal = new HashSet<>(cargo.maresWithFoal());
        for (RequestHorse rh : joining.getRequest().getHorses()) {
            horses.add(rh.getHorse());
            if (rh.isWithFoal()) withFoal.add(rh.getHorse().getId());
        }
        List<VehicleStall> stalls = new ArrayList<>();
        int payload = 0;
        for (TripVehicle tv : trailers) {
            stalls.addAll(vehicleStallRepository.findByVehicleIdOrderByPositionNo(
                    tv.getVehicle().getId()));
            payload += tv.getVehicle().getPayloadKg();
        }
        long boxNeeded = horses.stream().filter(h -> requiresBox(h, withFoal)).count();
        long climateNeeded = horses.stream()
                .filter(h -> !requiresBox(h, withFoal) && h.getRequiredStall() == StallType.CLIMATE)
                .count();
        long boxStalls =
                stalls.stream().filter(st -> st.getStallType() == StallType.BOX).count();
        long climateStalls = stalls.stream()
                .filter(st -> st.getStallType() == StallType.CLIMATE)
                .count();
        int weight = horses.stream()
                .mapToInt(h -> h.getWeightKg() != null ? h.getWeightKg() : 0)
                .sum();
        if (horses.size() > stalls.size())
            return horses.size() + " horses need a stall and the trip's trailers have " + stalls.size();
        if (boxNeeded > boxStalls) return boxNeeded + " horses need a box stall and there are " + boxStalls;
        if (climateNeeded > climateStalls)
            return climateNeeded + " horses need a climate stall and there are " + climateStalls;
        if (weight > payload) return "the horses weigh " + weight + " kg and the trailers carry " + payload + " kg";
        return null;
    }

    /**
     * Reopens the trip after its jobs changed (US-F3-11), as when a trailer is added: the load plans back to draft,
     * the confirmed route superseded with {@code reason}, and the sign-off cleared.
     */
    @Transactional
    public void reopenTrip(Trip trip, String reason) {
        reopen(trip, loadPlanRepository.findByTripIdForUpdate(trip.getId()), reason);
    }

    /** Takes {@code horseIds} out of every trailer of the trip; they no longer travel on it. */
    @Transactional
    public void unload(Trip trip, Collection<UUID> horseIds) {
        for (LoadPlan plan : loadPlanRepository.findByTripIdForUpdate(trip.getId())) {
            for (UUID horseId : horseIds) {
                loadPlanStallRepository.deleteByLoadPlanIdAndHorseId(plan.getId(), horseId);
            }
        }
    }

    /**
     * Nothing confirmed changes silently: the load plans go back to draft, the confirmed route is superseded by a new
     * draft version with {@code reason}, and every job on the trip needs a new sign-off.
     */
    private void reopen(Trip trip, List<LoadPlan> plans, String reason) {
        for (LoadPlan plan : plans) {
            if (plan.getStatus() == LoadPlanStatus.CONFIRMED) {
                plan.setStatus(LoadPlanStatus.DRAFT);
                plan.setConfirmedBy(null);
                plan.setConfirmedAt(null);
            }
        }
        routePlanService.reopen(trip, reason);
        for (TransportJob onTrip : jobTrips.jobsOn(trip)) {
            onTrip.setSignedOffAt(null);
            onTrip.setSignedOffBy(null);
        }
    }

    private static void clearSignOff(TransportJob job) {
        job.setSignedOffAt(null);
        job.setSignedOffBy(null);
    }

    private Cargo cargo(Trip trip) {
        List<Horse> horses = new ArrayList<>();
        Set<UUID> withFoal = new HashSet<>();
        Map<UUID, String> jobCodes = new HashMap<>();
        List<TripHorse> onThisTrip = jobTrips.horsesOn(trip);
        boolean shared =
                onThisTrip.stream().map(th -> th.getJob().getId()).distinct().count() > 1;
        for (TripHorse onTrip : onThisTrip) {
            horses.add(onTrip.getHorse());
            if (shared) jobCodes.put(onTrip.getHorse().getId(), onTrip.getJob().getCode());
            TransportRequest request = onTrip.getJob().getRequest();
            if (request != null && request.getHorses() != null) {
                for (RequestHorse rh : request.getHorses()) {
                    if (rh.isWithFoal()
                            && rh.getHorse() != null
                            && rh.getHorse().getId().equals(onTrip.getHorse().getId())) {
                        withFoal.add(rh.getHorse().getId());
                    }
                }
            }
        }
        return new Cargo(horses, withFoal, jobCodes);
    }

    private static Horse horseOnTrip(Cargo cargo, UUID horseId) {
        return cargo.horses().stream()
                .filter(h -> h.getId().equals(horseId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Horse " + horseId + " is not on this trip"));
    }

    /** The trailer plan whose vehicle has {@code stall}. */
    private static LoadPlan planWithStall(List<LoadPlan> plans, VehicleStall stall) {
        return plans.stream()
                .filter(p -> p.getVehicle().getId().equals(stall.getVehicle().getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Stall does not belong to a vehicle on this trip"));
    }

    private static void requireDraft(LoadPlan plan) {
        if (plan.getStatus() == LoadPlanStatus.CONFIRMED) {
            throw new BusinessException("Cannot modify a CONFIRMED load plan. Create a new revision if needed.");
        }
    }

    /** Where the horse stands on the trip, on whichever trailer; empty when it is waiting to load. */
    private Optional<LoadPlanStall> placementOf(List<LoadPlan> plans, UUID horseId) {
        for (LoadPlan plan : plans) {
            Optional<LoadPlanStall> found = loadPlanStallRepository.findByLoadPlanIdAndHorseId(plan.getId(), horseId);
            if (found.isPresent()) return found;
        }
        return Optional.empty();
    }

    @Transactional
    public TripLoadResponse assignStall(UUID jobId, UUID vehicleStallId, UUID horseId) {
        TransportJob job = job(jobId);
        Trip trip = jobTrips.tripOf(jobId);
        List<LoadPlan> plans = lockedPlans(trip, jobId);

        VehicleStall stall = vehicleStallRepository
                .findById(vehicleStallId)
                .orElseThrow(() -> new ResourceNotFoundException("Stall not found: " + vehicleStallId));
        LoadPlan plan = planWithStall(plans, stall);
        requireDraft(plan);

        // Validate before changing anything: the horse must travel on this trip.
        Horse horse = horseId == null ? null : horseOnTrip(cargo(trip), horseId);

        // Free the stall (bulk delete, runs before the insert below)
        loadPlanStallRepository.deleteByLoadPlanIdAndVehicleStallId(plan.getId(), vehicleStallId);

        // If assigning a horse, take it out of its previous stall on any trailer, then place it here
        if (horse != null) {
            Optional<LoadPlanStall> current = placementOf(plans, horse.getId());
            if (current.isPresent()) {
                requireDraft(current.get().getLoadPlan());
                loadPlanStallRepository.deleteByLoadPlanIdAndHorseId(
                        current.get().getLoadPlan().getId(), horse.getId());
            }
            place(plan, stall, horse);
        }

        clearSignOff(job);
        return buildResponse(trip, plans, job);
    }

    /**
     * Move, swap or unload one horse (US-F3-05, drag and drop), on one trailer or between trailers. The request
     * states what the coordinator's screen showed: where the horse was and who stood in the target stall. Both are
     * checked under the plans' row locks, so when two people change the same trip at once the second change is
     * refused with 409 instead of silently undoing the first.
     */
    @Transactional
    public TripLoadResponse moveHorse(UUID jobId, MoveHorseRequest request) {
        TransportJob job = job(jobId);
        Trip trip = jobTrips.tripOf(jobId);
        List<LoadPlan> plans = lockedPlans(trip, jobId);

        if (request.toStallId() == null && request.expectedOccupantId() != null) {
            throw new BusinessException(
                    "A horse taken off the vehicle has no stall to swap with; leave the expected occupant empty");
        }

        Horse horse = horseOnTrip(cargo(trip), request.horseId());

        VehicleStall toStall = null;
        LoadPlan toPlan = null;
        if (request.toStallId() != null) {
            toStall = vehicleStallRepository
                    .findById(request.toStallId())
                    .orElseThrow(() -> new ResourceNotFoundException("Stall not found: " + request.toStallId()));
            toPlan = planWithStall(plans, toStall);
            requireDraft(toPlan);
        }

        // Precondition 1: the horse is where the coordinator saw it.
        Optional<LoadPlanStall> current = placementOf(plans, horse.getId());
        current.ifPresent(c -> requireDraft(c.getLoadPlan()));
        if (toPlan == null && current.isEmpty()) {
            requireDraft(plans.getFirst());
        }
        UUID currentStallId = current.map(a -> a.getVehicleStall().getId()).orElse(null);
        if (!Objects.equals(currentStallId, request.fromStallId())) {
            throw new ConflictException(
                    "LOAD_PLAN_STALE",
                    horse.getName() + " is now "
                            + current.map(a -> "in stall " + a.getVehicleStall().getPositionNo())
                                    .orElse("waiting to load")
                            + ", not where your screen showed it. Someone else changed the load plan; check the refreshed plan and try again.");
        }

        // Precondition 2: the target stall holds who the coordinator saw there.
        Horse occupant = null;
        if (toStall != null) {
            occupant = loadPlanStallRepository
                    .findByLoadPlanIdAndVehicleStallId(toPlan.getId(), toStall.getId())
                    .map(LoadPlanStall::getHorse)
                    .orElse(null);
            UUID occupantId = occupant != null ? occupant.getId() : null;
            if (!Objects.equals(occupantId, request.expectedOccupantId())) {
                throw new ConflictException(
                        "LOAD_PLAN_STALE",
                        "Stall " + toStall.getPositionNo() + " "
                                + (occupant != null ? "now holds " + occupant.getName() : "is now empty")
                                + ", not what your screen showed. Someone else changed the load plan; check the refreshed plan and try again.");
            }
        }

        // Dropped where it already is: nothing to change.
        if (Objects.equals(request.toStallId(), currentStallId)) {
            return buildResponse(trip, plans, job);
        }

        // Free both positions first (bulk deletes run before the inserts below).
        if (current.isPresent()) {
            loadPlanStallRepository.deleteByLoadPlanIdAndHorseId(
                    current.get().getLoadPlan().getId(), horse.getId());
        }
        if (toStall != null) {
            loadPlanStallRepository.deleteByLoadPlanIdAndVehicleStallId(toPlan.getId(), toStall.getId());
        }

        try {
            if (toStall != null) {
                place(toPlan, toStall, horse);
            }
            // A swap: the occupant takes the moved horse's old stall, or waits to load when it came from the list.
            if (occupant != null && current.isPresent()) {
                place(current.get().getLoadPlan(), current.get().getVehicleStall(), occupant);
            }
            loadPlanStallRepository.flush();
        } catch (DataIntegrityViolationException e) {
            // The unique constraints are the backstop for a writer that skipped the plan lock.
            throw new ConflictException(
                    "LOAD_PLAN_STALE",
                    "Someone else changed the load plan at the same moment; check the refreshed plan and try again.");
        }

        clearSignOff(job);
        return buildResponse(trip, plans, job);
    }

    private void place(LoadPlan plan, VehicleStall stall, Horse horse) {
        LoadPlanStall lps = new LoadPlanStall();
        lps.setLoadPlan(plan);
        lps.setVehicleStall(stall);
        lps.setHorse(horse);
        loadPlanStallRepository.save(lps);
    }

    /** Places every horse on the trip across all its trailers with no rule broken, replacing the placements. */
    @Transactional
    public TripLoadResponse autoArrange(UUID jobId) {
        TransportJob job = job(jobId);
        Trip trip = jobTrips.tripOf(jobId);
        List<LoadPlan> plans = lockedPlans(trip, jobId);
        if (plans.stream().anyMatch(p -> p.getStatus() == LoadPlanStatus.CONFIRMED)) {
            throw new BusinessException("Cannot auto-arrange a CONFIRMED load plan");
        }

        Cargo cargo = cargo(trip);
        List<VehicleStall> stalls = new ArrayList<>();
        for (LoadPlan plan : plans) {
            stalls.addAll(vehicleStallRepository.findByVehicleIdOrderByPositionNo(
                    plan.getVehicle().getId()));
        }

        if (cargo.horses().size() > stalls.size()) {
            throw new BusinessException("The trip's trailers have only " + stalls.size()
                    + " stalls, cannot accommodate " + cargo.horses().size() + " horses. Add a trailer.");
        }

        // Smart arrangement:
        // 1. Box-needing horses (stallion or aggressive)
        // 2. Climate-needing horses (climate stall or nervous)
        // 3. Nervous horses away from ramp
        // 4. Mares away from stallions on the same trailer
        Map<Horse, VehicleStall> solution = solveArrangement(cargo.horses(), stalls, cargo.maresWithFoal());

        if (solution == null) {
            throw new BusinessException("Could not automatically find a placement satisfying all welfare rules");
        }

        // Replace the current placements. A bulk delete runs before the inserts; deleteAll(entities)
        // would be flushed after them and break the unique constraints when a horse was already placed.
        for (LoadPlan plan : plans) {
            loadPlanStallRepository.deleteAllForLoadPlan(plan.getId());
        }
        for (Map.Entry<Horse, VehicleStall> entry : solution.entrySet()) {
            place(planWithStall(plans, entry.getValue()), entry.getValue(), entry.getKey());
        }

        clearSignOff(job);
        return buildResponse(trip, plans, job);
    }

    /**
     * Confirms the trip's load: every horse on the trip placed on one trailer, no trailer with a conflict, and every
     * trailer booked for the trip's dates (US-F3-10).
     */
    @Transactional
    public TripLoadResponse confirmLoadPlan(UUID jobId, User currentUser) {
        return confirmLoadPlan(jobId, List.of(), currentUser);
    }

    /**
     * As {@link #confirmLoadPlan(UUID, User)}, with the biosecurity warnings the coordinator accepted: a warning that
     * is new or changed since it was accepted has to be accepted again before the load is confirmed (US-F3-12).
     */
    @Transactional
    public TripLoadResponse confirmLoadPlan(UUID jobId, Collection<String> acceptedWarnings, User currentUser) {
        TransportJob job = job(jobId);
        Trip trip = jobTrips.tripOf(jobId);
        List<LoadPlan> plans = lockedPlans(trip, jobId);

        for (LoadPlan plan : plans) {
            if (plan.getVehicle().getStatus() != VehicleStatus.ACTIVE) {
                throw new BusinessException("Vehicle " + plan.getVehicle().getCode() + " is currently in "
                        + plan.getVehicle().getStatus() + " and cannot be confirmed for load plan");
            }
        }

        TripLoadResponse state = buildResponse(trip, plans, job);

        if (!state.unassignedHorses().isEmpty()) {
            throw new BusinessException(
                    "Cannot confirm load plan: " + state.unassignedHorses().size() + " horses are still to be placed");
        }

        if (!state.conflicts().isEmpty()) {
            throw new BusinessException(
                    "Cannot confirm load plan: resolve " + state.conflicts().size() + " placement conflicts first ("
                            + state.conflicts().getFirst().description() + ")");
        }

        biosecurity.requireAccepted(trip, state.warnings(), acceptedWarnings, currentUser);

        // Every trailer is booked for the trip's planned dates, which the confirmed route sets: from the departure
        // until the last job on it arrives.
        List<TransportJob> jobsOnTrip = jobTrips.jobsOn(trip);
        if (jobsOnTrip.isEmpty()) jobsOnTrip = List.of(job);
        Instant startsAt =
                trip.getPlannedDepartureAt() != null ? trip.getPlannedDepartureAt() : job.getPlannedDepartureAt();
        Instant endsAt = jobsOnTrip.stream().anyMatch(j -> j.getPlannedArrivalAt() == null)
                ? null
                : jobsOnTrip.stream()
                        .map(TransportJob::getPlannedArrivalAt)
                        .max(Comparator.naturalOrder())
                        .orElse(null);
        if (startsAt == null || endsAt == null) {
            throw new BusinessException(
                    "Cannot confirm load plan: confirm the route plan first, so the vehicle can be booked "
                            + "for the planned departure and arrival");
        }

        for (LoadPlan plan : plans) {
            book(trip, plan.getVehicle(), startsAt, endsAt);
        }

        Instant now = Instant.now();
        for (LoadPlan plan : plans) {
            plan.setStatus(LoadPlanStatus.CONFIRMED);
            plan.setConfirmedBy(currentUser);
            plan.setConfirmedAt(now);
        }

        // Invalidate prior sign-off when load plan is re-confirmed
        clearSignOff(job);

        String vehicles = plans.stream().map(p -> p.getVehicle().getCode()).collect(Collectors.joining(", "));
        auditService.recordDecision(
                currentUser,
                "CONFIRM_LOAD_PLAN",
                "Confirmed load plan for job " + job.getCode() + " on " + (plans.size() == 1 ? "vehicle " : "vehicles ")
                        + vehicles,
                "LOAD_PLAN",
                plans.getFirst().getId(),
                job.getCode(),
                null,
                null,
                "CONFIRMED");

        log.info("Confirmed load plan for job {} on {}", job.getCode(), vehicles);
        return buildResponse(trip, plans, job);
    }

    /** Books {@code vehicle} for the trip, once; refused when another booking overlaps (BR-F3-04). */
    private void book(Trip trip, Vehicle vehicle, Instant startsAt, Instant endsAt) {
        boolean overlaps =
                vehicleBookingRepository.findOverlappingBookings(vehicle.getId(), startsAt, endsAt, null).stream()
                        .anyMatch(
                                b -> b.getTrip() == null || !b.getTrip().getId().equals(trip.getId()));
        if (overlaps) {
            throw new ConflictException(
                    "DOUBLE_BOOKING",
                    "Vehicle " + vehicle.getCode() + " is already booked between " + startsAt + " and " + endsAt);
        }
        VehicleBooking booking = vehicleBookingRepository
                .findByTrip_IdAndVehicle_Id(trip.getId(), vehicle.getId())
                .orElseGet(VehicleBooking::new);
        booking.setVehicle(vehicle);
        booking.setTrip(trip);
        booking.setKind(BookingKind.JOB);
        booking.setStartsAt(startsAt);
        booking.setEndsAt(endsAt);
        try {
            // Flushed here, so a booking that loses a race to the no-overlap constraint is caught below.
            vehicleBookingRepository.saveAndFlush(booking);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(
                    "DOUBLE_BOOKING", "Vehicle " + vehicle.getCode() + " is already booked for this interval");
        }
    }

    /**
     * The rules broken on one trailer, by every horse on it whichever job it belongs to: box, width, climate and ramp
     * needs, a stallion beside or behind a mare, and the trailer's payload.
     */
    public List<LoadPlanConflictResponse> evaluateConflicts(
            LoadPlan plan, Set<UUID> maresWithFoal, List<LoadPlanStall> assignments) {
        List<LoadPlanConflictResponse> conflicts = new ArrayList<>();
        Vehicle vehicle = plan.getVehicle();

        int totalWeight = 0;
        for (LoadPlanStall lps : assignments) {
            Horse h = lps.getHorse();
            VehicleStall s = lps.getVehicleStall();
            if (h.getWeightKg() != null) {
                totalWeight += h.getWeightKg();
            }

            // Rule 1: Box stall requirement
            if (requiresBox(h, maresWithFoal) && s.getStallType() != StallType.BOX) {
                String reason;
                if (maresWithFoal.contains(h.getId())) {
                    reason = "A mare with foal at foot takes a full box";
                } else if (h.getSex() == HorseSex.STALLION || h.getSex() == HorseSex.COLT) {
                    reason = "Needs a box stall (stallion)";
                } else if (h.getTemperament() == Temperament.AGGRESSIVE) {
                    reason = "Needs a box stall (aggressive horse)";
                } else if (h.getRequiredStall() == StallType.BOX) {
                    reason = "Needs a box stall (customer requested a box stall)";
                } else {
                    reason = "Needs a box stall";
                }
                conflicts.add(JobMapper.toConflictResponse(h, s, "BOX_REQUIRED", reason));
            }

            // Rule 1b: Horse width requirement vs stall width (US-F3-05)
            if (h.getSizeClass() != null
                    && h.getSizeClass().getWidthIn() > s.getStallType().getWidthIn()) {
                conflicts.add(JobMapper.toConflictResponse(
                        h,
                        s,
                        "WIDTH_EXCEEDED",
                        "Horse width (" + h.getSizeClass().getWidthIn() + " in) exceeds stall width ("
                                + s.getStallType().getWidthIn() + " in)"));
            }

            // Rule 2: Climate stall requirement
            if (h.getRequiredStall() == StallType.CLIMATE && s.getStallType() != StallType.CLIMATE) {
                conflicts.add(JobMapper.toConflictResponse(
                        h, s, "CLIMATE_REQUIRED", "Heat-sensitive horse needs climate stall"));
            }

            // Rule 3: Nervous horses away from ramp
            if (h.getTemperament() == Temperament.NERVOUS && s.isNearRamp()) {
                conflicts.add(JobMapper.toConflictResponse(
                        h, s, "NERVOUS_NEAR_RAMP", "Keep nervous horses away from the ramp"));
            }
        }

        // Rule 4: Stallion beside or behind a mare
        for (LoadPlanStall s1 : assignments) {
            Horse h1 = s1.getHorse();
            if (h1.getSex() != HorseSex.STALLION && h1.getSex() != HorseSex.COLT) {
                continue;
            }
            for (LoadPlanStall s2 : assignments) {
                Horse h2 = s2.getHorse();
                if (h2.getSex() != HorseSex.MARE && h2.getSex() != HorseSex.FILLY) {
                    continue;
                }
                VehicleStall stallStallion = s1.getVehicleStall();
                VehicleStall stallMare = s2.getVehicleStall();

                // Beside check: same row
                boolean beside = stallStallion.getRowNo() == stallMare.getRowNo();
                // Behind check: stallion row is mare row + 1
                boolean behind = stallStallion.getRowNo() == (stallMare.getRowNo() + 1);

                if (beside || behind) {
                    String reason = beside ? "Stallion stands beside a mare" : "Stallion stands behind a mare";
                    conflicts.add(JobMapper.toConflictResponse(h1, stallStallion, "STALLION_NEAR_MARE", reason));
                }
            }
        }

        // Rule 5: Payload check
        if (totalWeight > vehicle.getPayloadKg()) {
            conflicts.add(JobMapper.toConflictResponse(
                    null,
                    null,
                    "PAYLOAD_EXCEEDED",
                    "Payload limit exceeded (" + totalWeight + " kg of " + vehicle.getPayloadKg() + " kg)"));
        }

        return conflicts;
    }

    private TripLoadResponse buildResponse(Trip trip, List<LoadPlan> plans, TransportJob job) {
        Cargo cargo = cargo(trip);
        Map<UUID, List<LoadPlanStall>> byPlan =
                loadPlanStallRepository
                        .findByLoadPlanIdIn(plans.stream().map(LoadPlan::getId).toList())
                        .stream()
                        .collect(Collectors.groupingBy(a -> a.getLoadPlan().getId()));

        List<LoadPlanResponse> vehicles = new ArrayList<>();
        List<LoadPlanConflictResponse> allConflicts = new ArrayList<>();
        Set<UUID> placed = new HashSet<>();
        int totalWeight = 0;
        int payload = 0;
        for (LoadPlan plan : plans) {
            List<LoadPlanStall> assignments = byPlan.getOrDefault(plan.getId(), List.of());
            List<LoadPlanConflictResponse> conflicts = evaluateConflicts(plan, cargo.maresWithFoal(), assignments);
            allConflicts.addAll(conflicts);
            Map<UUID, String> stallIssues = new HashMap<>();
            for (LoadPlanConflictResponse c : conflicts) {
                if (c.stallId() != null) {
                    stallIssues.merge(c.stallId(), c.description(), (o, n) -> o + "; " + n);
                }
            }
            Map<UUID, LoadPlanStall> assignmentByStallId = assignments.stream()
                    .collect(Collectors.toMap(a -> a.getVehicleStall().getId(), a -> a));
            List<LoadPlanStallResponse> stalls =
                    vehicleStallRepository
                            .findByVehicleIdOrderByPositionNo(plan.getVehicle().getId())
                            .stream()
                            .map(s -> {
                                LoadPlanStall a = assignmentByStallId.get(s.getId());
                                JobHorseResponse horse =
                                        a != null && a.getHorse() != null ? cargo.response(a.getHorse()) : null;
                                return JobMapper.toLoadPlanStallResponse(s, horse, stallIssues.get(s.getId()));
                            })
                            .toList();
            int weight = assignments.stream()
                    .mapToInt(a ->
                            a.getHorse().getWeightKg() != null ? a.getHorse().getWeightKg() : 0)
                    .sum();
            assignments.forEach(a -> placed.add(a.getHorse().getId()));
            totalWeight += weight;
            payload += plan.getVehicle().getPayloadKg();
            vehicles.add(JobMapper.toLoadPlanResponse(plan, job, weight, stalls, conflicts));
        }

        List<JobHorseResponse> unassigned = cargo.horses().stream()
                .filter(h -> !placed.contains(h.getId()))
                .map(cargo::response)
                .toList();
        boolean confirmed = plans.stream().allMatch(p -> p.getStatus() == LoadPlanStatus.CONFIRMED);
        LoadPlan lastConfirmed = plans.stream()
                .filter(p -> p.getConfirmedAt() != null)
                .max(Comparator.comparing(LoadPlan::getConfirmedAt))
                .orElse(null);
        return TripLoadResponse.builder()
                .tripCode(trip.getCode())
                .status(confirmed ? LoadPlanStatus.CONFIRMED : LoadPlanStatus.DRAFT)
                .confirmedByName(
                        confirmed && lastConfirmed != null ? JobMapper.fullName(lastConfirmed.getConfirmedBy()) : null)
                .confirmedAt(confirmed && lastConfirmed != null ? lastConfirmed.getConfirmedAt() : null)
                .totalWeightKg(totalWeight)
                .payloadKg(payload)
                .vehicles(vehicles)
                .unassignedHorses(unassigned)
                .conflicts(allConflicts)
                .warnings(biosecurity.forTrip(trip))
                .build();
    }

    private boolean requiresBox(Horse horse, Set<UUID> maresWithFoal) {
        return maresWithFoal.contains(horse.getId())
                || horse.getSex() == HorseSex.STALLION
                || horse.getSex() == HorseSex.COLT
                || horse.getTemperament() == Temperament.AGGRESSIVE
                || horse.getRequiredStall() == StallType.BOX;
    }

    private boolean fitsStall(Horse horse, VehicleStall stall, Set<UUID> maresWithFoal) {
        if (requiresBox(horse, maresWithFoal) && stall.getStallType() != StallType.BOX) {
            return false;
        }
        if (horse.getSizeClass() != null
                && horse.getSizeClass().getWidthIn() > stall.getStallType().getWidthIn()) {
            return false;
        }
        if (horse.getRequiredStall() == StallType.CLIMATE && stall.getStallType() != StallType.CLIMATE) {
            return false;
        }
        if (horse.getTemperament() == Temperament.NERVOUS && stall.isNearRamp()) {
            return false;
        }
        return true;
    }

    private Map<Horse, VehicleStall> solveArrangement(
            List<Horse> horses, List<VehicleStall> stalls, Set<UUID> maresWithFoal) {
        // Backtracking solver to find a 0-conflict placement
        Map<Horse, VehicleStall> assignment = new HashMap<>();
        if (solveRecursive(0, horses, stalls, assignment, maresWithFoal)) {
            return assignment;
        }
        return null;
    }

    private static boolean sameVehicle(VehicleStall a, VehicleStall b) {
        return a.getVehicle() == null
                || b.getVehicle() == null
                || Objects.equals(a.getVehicle().getId(), b.getVehicle().getId());
    }

    private boolean solveRecursive(
            int index,
            List<Horse> horses,
            List<VehicleStall> stalls,
            Map<Horse, VehicleStall> current,
            Set<UUID> maresWithFoal) {
        if (index == horses.size()) {
            return true;
        }

        Horse horse = horses.get(index);
        Set<VehicleStall> usedStalls = new HashSet<>(current.values());

        for (VehicleStall stall : stalls) {
            if (usedStalls.contains(stall)) {
                continue;
            }

            // Check hard constraints for this candidate stall:
            if (!fitsStall(horse, stall, maresWithFoal)) {
                continue;
            }

            // Stallion near mare check against horses already placed on the same trailer:
            boolean isStallion = (horse.getSex() == HorseSex.STALLION || horse.getSex() == HorseSex.COLT);
            boolean isMare = (horse.getSex() == HorseSex.MARE || horse.getSex() == HorseSex.FILLY);
            boolean violatesProximity = false;

            for (Map.Entry<Horse, VehicleStall> entry : current.entrySet()) {
                Horse placedHorse = entry.getKey();
                VehicleStall placedStall = entry.getValue();
                if (!sameVehicle(stall, placedStall)) {
                    continue;
                }

                if (isStallion && (placedHorse.getSex() == HorseSex.MARE || placedHorse.getSex() == HorseSex.FILLY)) {
                    if (stall.getRowNo() == placedStall.getRowNo()
                            || stall.getRowNo() == (placedStall.getRowNo() + 1)) {
                        violatesProximity = true;
                        break;
                    }
                }
                if (isMare && (placedHorse.getSex() == HorseSex.STALLION || placedHorse.getSex() == HorseSex.COLT)) {
                    if (stall.getRowNo() == placedStall.getRowNo()
                            || placedStall.getRowNo() == (stall.getRowNo() + 1)) {
                        violatesProximity = true;
                        break;
                    }
                }
            }

            if (violatesProximity) {
                continue;
            }

            current.put(horse, stall);
            if (solveRecursive(index + 1, horses, stalls, current, maresWithFoal)) {
                return true;
            }
            current.remove(horse);
        }

        return false;
    }
}
