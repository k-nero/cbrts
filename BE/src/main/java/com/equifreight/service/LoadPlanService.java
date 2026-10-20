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

@Service
@Log4j2
public class LoadPlanService {

    private final LoadPlanRepository loadPlanRepository;
    private final LoadPlanStallRepository loadPlanStallRepository;
    private final TransportJobRepository transportJobRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleStallRepository vehicleStallRepository;
    private final HorseRepository horseRepository;
    private final VehicleBookingRepository vehicleBookingRepository;
    private final AuditService auditService;

    public LoadPlanService(
            LoadPlanRepository loadPlanRepository,
            LoadPlanStallRepository loadPlanStallRepository,
            TransportJobRepository transportJobRepository,
            VehicleRepository vehicleRepository,
            VehicleStallRepository vehicleStallRepository,
            HorseRepository horseRepository,
            VehicleBookingRepository vehicleBookingRepository,
            AuditService auditService) {
        this.loadPlanRepository = loadPlanRepository;
        this.loadPlanStallRepository = loadPlanStallRepository;
        this.transportJobRepository = transportJobRepository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleStallRepository = vehicleStallRepository;
        this.horseRepository = horseRepository;
        this.vehicleBookingRepository = vehicleBookingRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Optional<LoadPlanResponse> getActiveLoadPlan(UUID jobId) {
        return loadPlanRepository.findFirstByJobIdOrderByCreatedAtDesc(jobId).map(this::buildResponse);
    }

    @Transactional
    public LoadPlanResponse createLoadPlan(UUID jobId, UUID vehicleId) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        Vehicle vehicle;
        if (vehicleId != null) {
            vehicle = vehicleRepository
                    .findById(vehicleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + vehicleId));
        } else {
            vehicle = vehicleRepository.findAllByStatus(VehicleStatus.ACTIVE).stream()
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("No active vehicles available to create load plan"));
        }

        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            throw new BusinessException("Vehicle " + vehicle.getCode() + " is currently in " + vehicle.getStatus()
                    + " and cannot be used for load plan");
        }

        Optional<LoadPlan> existingDraft = loadPlanRepository.findByJobIdAndStatus(jobId, LoadPlanStatus.DRAFT);
        LoadPlan plan;
        if (existingDraft.isPresent()) {
            plan = existingDraft.get();
            if (!plan.getVehicle().getId().equals(vehicle.getId())) {
                loadPlanStallRepository.deleteAllForLoadPlan(plan.getId());
                plan.setVehicle(vehicle);
                plan = loadPlanRepository.save(plan);
            }
        } else {
            plan = new LoadPlan();
            plan.setJob(job);
            plan.setVehicle(vehicle);
            plan.setStatus(LoadPlanStatus.DRAFT);
            plan = loadPlanRepository.save(plan);
        }

        return buildResponse(plan);
    }

    @Transactional
    public LoadPlanResponse changeLoadPlanVehicle(UUID jobId, UUID vehicleId) {
        return createLoadPlan(jobId, vehicleId);
    }

    @Transactional
    public LoadPlanResponse assignStall(UUID jobId, UUID vehicleStallId, UUID horseId) {
        LoadPlan plan = loadPlanRepository
                .findLatestByJobIdForUpdate(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Load plan not found for job: " + jobId));

        if (plan.getStatus() == LoadPlanStatus.CONFIRMED) {
            throw new BusinessException("Cannot modify a CONFIRMED load plan. Create a new revision if needed.");
        }

        VehicleStall stall = vehicleStallRepository
                .findById(vehicleStallId)
                .orElseThrow(() -> new ResourceNotFoundException("Stall not found: " + vehicleStallId));

        if (!stall.getVehicle().getId().equals(plan.getVehicle().getId())) {
            throw new BusinessException("Stall does not belong to the vehicle assigned to this load plan");
        }

        // Validate before changing anything: the horse must travel on this job.
        if (horseId != null) {
            boolean horseOnJob = plan.getJob().getRequest() != null
                    && plan.getJob().getRequest().getHorses() != null
                    && plan.getJob().getRequest().getHorses().stream()
                            .anyMatch(rh -> rh.getHorse().getId().equals(horseId));
            if (!horseOnJob) {
                throw new ResourceNotFoundException("Horse " + horseId + " is not assigned to this job");
            }
        }

        // Free the stall (bulk delete, runs before the insert below)
        loadPlanStallRepository.deleteByLoadPlanIdAndVehicleStallId(plan.getId(), vehicleStallId);

        // If assigning a horse, take it out of its previous stall, then place it here
        if (horseId != null) {
            loadPlanStallRepository.deleteByLoadPlanIdAndHorseId(plan.getId(), horseId);

            Horse horse = horseRepository
                    .findById(horseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));

            LoadPlanStall lps = new LoadPlanStall();
            lps.setLoadPlan(plan);
            lps.setVehicleStall(stall);
            lps.setHorse(horse);
            loadPlanStallRepository.save(lps);
        }

        // Invalidate prior sign-off when load plan changes
        plan.getJob().setSignedOffAt(null);
        plan.getJob().setSignedOffBy(null);
        transportJobRepository.save(plan.getJob());

        return buildResponse(plan);
    }

    /**
     * Move, swap or unload one horse (US-F3-05, drag and drop). The request states what the
     * coordinator's screen showed: where the horse was and who stood in the target stall. Both are
     * checked under the plan's row lock, so when two people change the same plan at once the second
     * change is refused with 409 instead of silently undoing the first.
     */
    @Transactional
    public LoadPlanResponse moveHorse(UUID jobId, MoveHorseRequest request) {
        LoadPlan plan = loadPlanRepository
                .findLatestByJobIdForUpdate(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Load plan not found for job: " + jobId));

        if (plan.getStatus() == LoadPlanStatus.CONFIRMED) {
            throw new BusinessException("Cannot modify a CONFIRMED load plan. Create a new revision if needed.");
        }
        if (request.toStallId() == null && request.expectedOccupantId() != null) {
            throw new BusinessException(
                    "A horse taken off the vehicle has no stall to swap with; leave the expected occupant empty");
        }

        Horse horse = getJobHorses(plan.getJob()).stream()
                .filter(h -> h.getId().equals(request.horseId()))
                .findFirst()
                .orElseThrow(() ->
                        new ResourceNotFoundException("Horse " + request.horseId() + " is not assigned to this job"));

        VehicleStall toStall = null;
        if (request.toStallId() != null) {
            toStall = vehicleStallRepository
                    .findById(request.toStallId())
                    .orElseThrow(() -> new ResourceNotFoundException("Stall not found: " + request.toStallId()));
            if (!toStall.getVehicle().getId().equals(plan.getVehicle().getId())) {
                throw new BusinessException("Stall does not belong to the vehicle assigned to this load plan");
            }
        }

        // Precondition 1: the horse is where the coordinator saw it.
        Optional<LoadPlanStall> current =
                loadPlanStallRepository.findByLoadPlanIdAndHorseId(plan.getId(), horse.getId());
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
                    .findByLoadPlanIdAndVehicleStallId(plan.getId(), toStall.getId())
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
            return buildResponse(plan);
        }

        // Free both positions first (bulk deletes run before the inserts below).
        loadPlanStallRepository.deleteByLoadPlanIdAndHorseId(plan.getId(), horse.getId());
        if (toStall != null) {
            loadPlanStallRepository.deleteByLoadPlanIdAndVehicleStallId(plan.getId(), toStall.getId());
        }

        try {
            if (toStall != null) {
                place(plan, toStall, horse);
            }
            // A swap: the occupant takes the moved horse's old stall, or waits to load when it came from the list.
            if (occupant != null && current.isPresent()) {
                place(plan, current.get().getVehicleStall(), occupant);
            }
            loadPlanStallRepository.flush();
        } catch (DataIntegrityViolationException e) {
            // The unique constraints are the backstop for a writer that skipped the plan lock.
            throw new ConflictException(
                    "LOAD_PLAN_STALE",
                    "Someone else changed the load plan at the same moment; check the refreshed plan and try again.");
        }

        // Invalidate prior sign-off when load plan changes
        plan.getJob().setSignedOffAt(null);
        plan.getJob().setSignedOffBy(null);
        transportJobRepository.save(plan.getJob());

        return buildResponse(plan);
    }

    private void place(LoadPlan plan, VehicleStall stall, Horse horse) {
        LoadPlanStall lps = new LoadPlanStall();
        lps.setLoadPlan(plan);
        lps.setVehicleStall(stall);
        lps.setHorse(horse);
        loadPlanStallRepository.save(lps);
    }

    @Transactional
    public LoadPlanResponse autoArrange(UUID jobId) {
        LoadPlan plan = loadPlanRepository
                .findLatestByJobIdForUpdate(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Load plan not found for job: " + jobId));

        if (plan.getStatus() == LoadPlanStatus.CONFIRMED) {
            throw new BusinessException("Cannot auto-arrange a CONFIRMED load plan");
        }

        List<Horse> horses = getJobHorses(plan.getJob());
        List<VehicleStall> stalls = vehicleStallRepository.findByVehicleIdOrderByPositionNo(
                plan.getVehicle().getId());

        if (horses.size() > stalls.size()) {
            throw new BusinessException(
                    "Vehicle has only " + stalls.size() + " stalls, cannot accommodate " + horses.size() + " horses");
        }

        // Smart arrangement:
        // 1. Box-needing horses (stallion or aggressive)
        // 2. Climate-needing horses (climate stall or nervous)
        // 3. Nervous horses away from ramp
        // 4. Mares away from stallions
        Set<VehicleStall> availableStalls = new HashSet<>(stalls);
        Map<Horse, VehicleStall> solution = solveArrangement(horses, availableStalls, getHorsesWithFoal(plan.getJob()));

        if (solution == null) {
            throw new BusinessException("Could not automatically find a placement satisfying all welfare rules");
        }

        // Replace the current placements. A bulk delete runs before the inserts; deleteAll(entities)
        // would be flushed after them and break the unique constraints when a horse was already placed.
        loadPlanStallRepository.deleteAllForLoadPlan(plan.getId());
        for (Map.Entry<Horse, VehicleStall> entry : solution.entrySet()) {
            LoadPlanStall lps = new LoadPlanStall();
            lps.setLoadPlan(plan);
            lps.setHorse(entry.getKey());
            lps.setVehicleStall(entry.getValue());
            loadPlanStallRepository.save(lps);
        }

        // Invalidate prior sign-off when load plan changes
        plan.getJob().setSignedOffAt(null);
        plan.getJob().setSignedOffBy(null);
        transportJobRepository.save(plan.getJob());

        return buildResponse(plan);
    }

    @Transactional
    public LoadPlanResponse confirmLoadPlan(UUID jobId, User currentUser) {
        LoadPlan plan = loadPlanRepository
                .findLatestByJobIdForUpdate(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Load plan not found for job: " + jobId));

        if (plan.getVehicle().getStatus() != VehicleStatus.ACTIVE) {
            throw new BusinessException("Vehicle " + plan.getVehicle().getCode() + " is currently in "
                    + plan.getVehicle().getStatus() + " and cannot be confirmed for load plan");
        }

        LoadPlanResponse state = buildResponse(plan);

        if (!state.unassignedHorses().isEmpty()) {
            throw new BusinessException(
                    "Cannot confirm load plan: " + state.unassignedHorses().size() + " horses are still to be placed");
        }

        if (!state.conflicts().isEmpty()) {
            throw new BusinessException(
                    "Cannot confirm load plan: resolve " + state.conflicts().size() + " placement conflicts first ("
                            + state.conflicts().getFirst().description() + ")");
        }

        // The vehicle is booked for the trip's planned dates, which the confirmed route sets.
        TransportJob job = plan.getJob();
        Instant startsAt = job.getPlannedDepartureAt();
        Instant endsAt = job.getPlannedArrivalAt();
        if (startsAt == null || endsAt == null) {
            throw new BusinessException(
                    "Cannot confirm load plan: confirm the route plan first, so the vehicle can be booked "
                            + "for the planned departure and arrival");
        }

        // Check overlapping bookings excluding this job
        List<VehicleBooking> overlaps =
                vehicleBookingRepository
                        .findOverlappingBookings(plan.getVehicle().getId(), startsAt, endsAt, null)
                        .stream()
                        .filter(b -> b.getJob() == null || !b.getJob().getId().equals(job.getId()))
                        .toList();
        if (!overlaps.isEmpty()) {
            throw new ConflictException(
                    "DOUBLE_BOOKING",
                    "Vehicle " + plan.getVehicle().getCode() + " is already booked between " + startsAt + " and "
                            + endsAt);
        }

        // Create or update vehicle booking
        List<VehicleBooking> jobBookings = vehicleBookingRepository.findByJobId(job.getId());
        VehicleBooking booking = jobBookings.isEmpty() ? new VehicleBooking() : jobBookings.getFirst();
        booking.setVehicle(plan.getVehicle());
        booking.setJob(job);
        booking.setKind(com.equifreight.entity.enums.BookingKind.JOB);
        booking.setStartsAt(startsAt);
        booking.setEndsAt(endsAt);

        try {
            // Flushed here, so a booking that loses a race to the no-overlap constraint is caught below.
            vehicleBookingRepository.saveAndFlush(booking);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ConflictException(
                    "DOUBLE_BOOKING",
                    "Vehicle " + plan.getVehicle().getCode() + " is already booked for this interval");
        }

        plan.setStatus(LoadPlanStatus.CONFIRMED);
        plan.setConfirmedBy(currentUser);
        plan.setConfirmedAt(Instant.now());
        loadPlanRepository.save(plan);

        // Invalidate prior sign-off when load plan is re-confirmed
        job.setSignedOffAt(null);
        job.setSignedOffBy(null);
        transportJobRepository.save(job);

        auditService.recordDecision(
                currentUser,
                "CONFIRM_LOAD_PLAN",
                "Confirmed load plan for job " + job.getCode() + " on vehicle "
                        + plan.getVehicle().getCode(),
                "LOAD_PLAN",
                plan.getId(),
                job.getCode(),
                null,
                null,
                "CONFIRMED");

        log.info("Confirmed load plan for job {}", job.getCode());
        return buildResponse(plan);
    }

    public List<LoadPlanConflictResponse> evaluateConflicts(
            LoadPlan plan, List<LoadPlanStall> assignments, List<Horse> allHorses) {
        List<LoadPlanConflictResponse> conflicts = new ArrayList<>();
        Vehicle vehicle = plan.getVehicle();
        Set<UUID> maresWithFoal = getHorsesWithFoal(plan.getJob());

        int totalWeight = 0;
        for (LoadPlanStall lps : assignments) {
            Horse h = lps.getHorse();
            VehicleStall s = lps.getVehicleStall();
            if (h.getWeightKg() != null) {
                totalWeight += h.getWeightKg();
            }

            // Rule 1: Box stall requirement
            if (requiresBox(h, maresWithFoal) && s.getStallType() != StallType.BOX) {
                String reason = maresWithFoal.contains(h.getId())
                        ? "A mare with foal at foot takes a full box"
                        : "Needs a box stall (stallion or aggressive horse)";
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

    private LoadPlanResponse buildResponse(LoadPlan plan) {
        List<LoadPlanStall> assignments = loadPlanStallRepository.findByLoadPlanId(plan.getId());
        List<Horse> allHorses = getJobHorses(plan.getJob());
        List<VehicleStall> allStalls = vehicleStallRepository.findByVehicleIdOrderByPositionNo(
                plan.getVehicle().getId());

        List<LoadPlanConflictResponse> conflicts = evaluateConflicts(plan, assignments, allHorses);
        Map<UUID, String> stallIssues = new HashMap<>();
        for (LoadPlanConflictResponse c : conflicts) {
            if (c.stallId() != null) {
                stallIssues.merge(c.stallId(), c.description(), (o, n) -> o + "; " + n);
            }
        }

        Map<UUID, LoadPlanStall> assignmentByStallId = assignments.stream()
                .collect(Collectors.toMap(a -> a.getVehicleStall().getId(), a -> a));

        List<LoadPlanStallResponse> stallResponses = allStalls.stream()
                .map(s -> {
                    LoadPlanStall a = assignmentByStallId.get(s.getId());
                    JobHorseResponse hResp = null;
                    if (a != null && a.getHorse() != null) {
                        hResp = JobMapper.toHorseResponse(a.getHorse());
                    }
                    return JobMapper.toLoadPlanStallResponse(s, hResp, stallIssues.get(s.getId()));
                })
                .toList();

        Set<UUID> assignedHorseIds =
                assignments.stream().map(a -> a.getHorse().getId()).collect(Collectors.toSet());

        List<JobHorseResponse> unassigned = allHorses.stream()
                .filter(h -> !assignedHorseIds.contains(h.getId()))
                .map(JobMapper::toHorseResponse)
                .toList();

        int totalWeight = assignments.stream()
                .mapToInt(a -> a.getHorse().getWeightKg() != null ? a.getHorse().getWeightKg() : 0)
                .sum();

        return JobMapper.toLoadPlanResponse(plan, totalWeight, stallResponses, unassigned, conflicts);
    }

    private List<Horse> getJobHorses(TransportJob job) {
        if (job.getRequest() != null && job.getRequest().getHorses() != null) {
            return job.getRequest().getHorses().stream()
                    .map(RequestHorse::getHorse)
                    .toList();
        }
        return Collections.emptyList();
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

    private Set<UUID> getHorsesWithFoal(TransportJob job) {
        Set<UUID> mares = new HashSet<>();
        if (job != null && job.getRequest() != null && job.getRequest().getHorses() != null) {
            for (RequestHorse rh : job.getRequest().getHorses()) {
                if (rh.isWithFoal() && rh.getHorse() != null) {
                    mares.add(rh.getHorse().getId());
                }
            }
        }
        return mares;
    }

    private Map<Horse, VehicleStall> solveArrangement(
            List<Horse> horses, Set<VehicleStall> availableStalls, Set<UUID> maresWithFoal) {
        // Backtracking solver to find a 0-conflict placement
        Map<Horse, VehicleStall> assignment = new HashMap<>();
        if (solveRecursive(0, horses, new ArrayList<>(availableStalls), assignment, maresWithFoal)) {
            return assignment;
        }
        return null;
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

            // Stallion near mare check against currently placed horses:
            boolean isStallion = (horse.getSex() == HorseSex.STALLION || horse.getSex() == HorseSex.COLT);
            boolean isMare = (horse.getSex() == HorseSex.MARE || horse.getSex() == HorseSex.FILLY);
            boolean violatesProximity = false;

            for (Map.Entry<Horse, VehicleStall> entry : current.entrySet()) {
                Horse placedHorse = entry.getKey();
                VehicleStall placedStall = entry.getValue();

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
