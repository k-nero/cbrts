package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.*;
import com.equifreight.repository.*;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Log4j2
public class LoadPlanService {

    private final LoadPlanRepository loadPlanRepository;
    private final LoadPlanStallRepository loadPlanStallRepository;
    private final TransportJobRepository transportJobRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleStallRepository vehicleStallRepository;
    private final HorseRepository horseRepository;
    private final AuditLogRepository auditLogRepository;

    public LoadPlanService(LoadPlanRepository loadPlanRepository,
                           LoadPlanStallRepository loadPlanStallRepository,
                           TransportJobRepository transportJobRepository,
                           VehicleRepository vehicleRepository,
                           VehicleStallRepository vehicleStallRepository,
                           HorseRepository horseRepository,
                           AuditLogRepository auditLogRepository) {
        this.loadPlanRepository = loadPlanRepository;
        this.loadPlanStallRepository = loadPlanStallRepository;
        this.transportJobRepository = transportJobRepository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleStallRepository = vehicleStallRepository;
        this.horseRepository = horseRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public LoadPlanResponse getOrCreateLoadPlan(UUID jobId) {
        TransportJob job = transportJobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        Optional<LoadPlan> existing = loadPlanRepository.findFirstByJobIdOrderByCreatedAtDesc(jobId);
        LoadPlan plan;
        if (existing.isPresent()) {
            plan = existing.get();
        } else {
            // Find default vehicle or first active vehicle
            Vehicle vehicle = vehicleRepository.findAllByStatus(VehicleStatus.ACTIVE).stream()
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("No active vehicles available to create load plan"));

            plan = new LoadPlan();
            plan.setJob(job);
            plan.setVehicle(vehicle);
            plan.setStatus(LoadPlanStatus.DRAFT);
            plan = loadPlanRepository.save(plan);
        }

        return buildResponse(plan);
    }

    @Transactional
    public LoadPlanResponse assignStall(UUID jobId, UUID vehicleStallId, UUID horseId) {
        LoadPlan plan = loadPlanRepository.findFirstByJobIdOrderByCreatedAtDesc(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Load plan not found for job: " + jobId));

        if (plan.getStatus() == LoadPlanStatus.CONFIRMED) {
            throw new BusinessException("Cannot modify a CONFIRMED load plan. Create a new revision if needed.");
        }

        VehicleStall stall = vehicleStallRepository.findById(vehicleStallId)
                .orElseThrow(() -> new ResourceNotFoundException("Stall not found: " + vehicleStallId));

        if (!stall.getVehicle().getId().equals(plan.getVehicle().getId())) {
            throw new BusinessException("Stall does not belong to the vehicle assigned to this load plan");
        }

        // Remove any existing assignment on this stall
        loadPlanStallRepository.deleteByLoadPlanIdAndVehicleStallId(plan.getId(), vehicleStallId);

        // If assigning a horse, remove horse from previous stall if any, then insert
        if (horseId != null) {
            loadPlanStallRepository.deleteByLoadPlanIdAndHorseId(plan.getId(), horseId);

            Horse horse = horseRepository.findById(horseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));

            LoadPlanStall lps = new LoadPlanStall();
            lps.setLoadPlan(plan);
            lps.setVehicleStall(stall);
            lps.setHorse(horse);
            loadPlanStallRepository.save(lps);
        }

        return buildResponse(plan);
    }

    @Transactional
    public LoadPlanResponse autoArrange(UUID jobId) {
        LoadPlan plan = loadPlanRepository.findFirstByJobIdOrderByCreatedAtDesc(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Load plan not found for job: " + jobId));

        if (plan.getStatus() == LoadPlanStatus.CONFIRMED) {
            throw new BusinessException("Cannot auto-arrange a CONFIRMED load plan");
        }

        // Clear existing stall assignments for this plan
        List<LoadPlanStall> current = loadPlanStallRepository.findByLoadPlanId(plan.getId());
        loadPlanStallRepository.deleteAll(current);

        List<Horse> horses = getJobHorses(plan.getJob());
        List<VehicleStall> stalls = vehicleStallRepository.findByVehicleIdOrderByPositionNo(plan.getVehicle().getId());

        if (horses.size() > stalls.size()) {
            throw new BusinessException("Vehicle has only " + stalls.size() + " stalls, cannot accommodate " + horses.size() + " horses");
        }

        // Smart arrangement:
        // 1. Box-needing horses (stallion or aggressive)
        // 2. Climate-needing horses (climate stall or nervous)
        // 3. Nervous horses away from ramp
        // 4. Mares away from stallions
        Set<VehicleStall> availableStalls = new HashSet<>(stalls);
        Map<Horse, VehicleStall> solution = solveArrangement(horses, availableStalls);

        if (solution == null) {
            throw new BusinessException("Could not automatically find a placement satisfying all welfare rules");
        }

        for (Map.Entry<Horse, VehicleStall> entry : solution.entrySet()) {
            LoadPlanStall lps = new LoadPlanStall();
            lps.setLoadPlan(plan);
            lps.setHorse(entry.getKey());
            lps.setVehicleStall(entry.getValue());
            loadPlanStallRepository.save(lps);
        }

        return buildResponse(plan);
    }

    @Transactional
    public LoadPlanResponse confirmLoadPlan(UUID jobId, User currentUser) {
        LoadPlan plan = loadPlanRepository.findFirstByJobIdOrderByCreatedAtDesc(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Load plan not found for job: " + jobId));

        LoadPlanResponse state = buildResponse(plan);

        if (!state.getUnassignedHorses().isEmpty()) {
            throw new BusinessException("Cannot confirm load plan: " + state.getUnassignedHorses().size() + " horses are still to be placed");
        }

        if (!state.getConflicts().isEmpty()) {
            throw new BusinessException("Cannot confirm load plan: resolve " + state.getConflicts().size() + " placement conflicts first (" + state.getConflicts().get(0).getDescription() + ")");
        }

        plan.setStatus(LoadPlanStatus.CONFIRMED);
        plan.setConfirmedBy(currentUser);
        plan.setConfirmedAt(Instant.now());
        loadPlanRepository.save(plan);

        // Audit log
        AuditLog audit = new AuditLog();
        audit.setActor(currentUser);
        audit.setActorLabel(currentUser != null ? currentUser.getFirstName() + " " + currentUser.getLastName() : "System");
        audit.setChannel(Channel.WEB);
        audit.setAction("CONFIRM_LOAD_PLAN");
        audit.setSummary("Confirmed load plan for job " + plan.getJob().getCode() + " on vehicle " + plan.getVehicle().getCode());
        audit.setEntityCode(plan.getJob().getCode());
        auditLogRepository.save(audit);

        log.info("Confirmed load plan for job {}", plan.getJob().getCode());
        return buildResponse(plan);
    }

    public List<LoadPlanConflictResponse> evaluateConflicts(LoadPlan plan, List<LoadPlanStall> assignments, List<Horse> allHorses) {
        List<LoadPlanConflictResponse> conflicts = new ArrayList<>();
        Vehicle vehicle = plan.getVehicle();

        int totalWeight = 0;
        for (LoadPlanStall lps : assignments) {
            Horse h = lps.getHorse();
            VehicleStall s = lps.getVehicleStall();
            if (h.getWeightKg() != null) {
                totalWeight += h.getWeightKg();
            }

            // Rule 1: Box stall requirement (stallion or aggressive horse)
            boolean needsBox = (h.getSex() == HorseSex.STALLION || h.getSex() == HorseSex.COLT || h.getTemperament() == Temperament.AGGRESSIVE || h.getRequiredStall() == StallType.BOX);
            if (needsBox && s.getStallType() != StallType.BOX) {
                conflicts.add(LoadPlanConflictResponse.builder()
                        .horseId(h.getId())
                        .horseName(h.getName())
                        .stallId(s.getId())
                        .stallPositionNo(s.getPositionNo())
                        .rule("BOX_REQUIRED")
                        .description("Needs a box stall (stallion or aggressive horse)")
                        .build());
            }

            // Rule 2: Climate stall requirement
            if (h.getRequiredStall() == StallType.CLIMATE && s.getStallType() != StallType.CLIMATE) {
                conflicts.add(LoadPlanConflictResponse.builder()
                        .horseId(h.getId())
                        .horseName(h.getName())
                        .stallId(s.getId())
                        .stallPositionNo(s.getPositionNo())
                        .rule("CLIMATE_REQUIRED")
                        .description("Heat-sensitive horse needs climate stall")
                        .build());
            }

            // Rule 3: Nervous horses away from ramp
            if (h.getTemperament() == Temperament.NERVOUS && s.isNearRamp()) {
                conflicts.add(LoadPlanConflictResponse.builder()
                        .horseId(h.getId())
                        .horseName(h.getName())
                        .stallId(s.getId())
                        .stallPositionNo(s.getPositionNo())
                        .rule("NERVOUS_NEAR_RAMP")
                        .description("Keep nervous horses away from the ramp")
                        .build());
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
                    conflicts.add(LoadPlanConflictResponse.builder()
                            .horseId(h1.getId())
                            .horseName(h1.getName())
                            .stallId(stallStallion.getId())
                            .stallPositionNo(stallStallion.getPositionNo())
                            .rule("STALLION_NEAR_MARE")
                            .description(reason)
                            .build());
                }
            }
        }

        // Rule 5: Payload check
        if (totalWeight > vehicle.getPayloadKg()) {
            conflicts.add(LoadPlanConflictResponse.builder()
                    .rule("PAYLOAD_EXCEEDED")
                    .description("Payload limit exceeded (" + totalWeight + " kg of " + vehicle.getPayloadKg() + " kg)")
                    .build());
        }

        return conflicts;
    }

    private LoadPlanResponse buildResponse(LoadPlan plan) {
        List<LoadPlanStall> assignments = loadPlanStallRepository.findByLoadPlanId(plan.getId());
        List<Horse> allHorses = getJobHorses(plan.getJob());
        List<VehicleStall> allStalls = vehicleStallRepository.findByVehicleIdOrderByPositionNo(plan.getVehicle().getId());

        List<LoadPlanConflictResponse> conflicts = evaluateConflicts(plan, assignments, allHorses);
        Map<UUID, String> stallIssues = new HashMap<>();
        for (LoadPlanConflictResponse c : conflicts) {
            if (c.getStallId() != null) {
                stallIssues.merge(c.getStallId(), c.getDescription(), (o, n) -> o + "; " + n);
            }
        }

        Map<UUID, LoadPlanStall> assignmentByStallId = assignments.stream()
                .collect(Collectors.toMap(a -> a.getVehicleStall().getId(), a -> a));

        List<LoadPlanStallResponse> stallResponses = allStalls.stream()
                .map(s -> {
                    LoadPlanStall a = assignmentByStallId.get(s.getId());
                    JobHorseResponse hResp = null;
                    if (a != null && a.getHorse() != null) {
                        hResp = toHorseResponse(a.getHorse());
                    }
                    return LoadPlanStallResponse.builder()
                            .stallId(s.getId())
                            .positionNo(s.getPositionNo())
                            .stallType(s.getStallType())
                            .rowNo(s.getRowNo())
                            .side(s.getSide())
                            .nearRamp(s.isNearRamp())
                            .horse(hResp)
                            .issue(stallIssues.get(s.getId()))
                            .build();
                })
                .toList();

        Set<UUID> assignedHorseIds = assignments.stream()
                .map(a -> a.getHorse().getId())
                .collect(Collectors.toSet());

        List<JobHorseResponse> unassigned = allHorses.stream()
                .filter(h -> !assignedHorseIds.contains(h.getId()))
                .map(this::toHorseResponse)
                .toList();

        int totalWeight = assignments.stream()
                .mapToInt(a -> a.getHorse().getWeightKg() != null ? a.getHorse().getWeightKg() : 0)
                .sum();

        return LoadPlanResponse.builder()
                .id(plan.getId())
                .jobId(plan.getJob().getId())
                .vehicleId(plan.getVehicle().getId())
                .vehicleCode(plan.getVehicle().getCode())
                .status(plan.getStatus())
                .confirmedByName(plan.getConfirmedBy() != null ? plan.getConfirmedBy().getFirstName() + " " + plan.getConfirmedBy().getLastName() : null)
                .confirmedAt(plan.getConfirmedAt())
                .totalWeightKg(totalWeight)
                .payloadKg(plan.getVehicle().getPayloadKg())
                .stalls(stallResponses)
                .unassignedHorses(unassigned)
                .conflicts(conflicts)
                .build();
    }

    private List<Horse> getJobHorses(TransportJob job) {
        if (job.getRequest() != null && job.getRequest().getHorses() != null) {
            return job.getRequest().getHorses().stream()
                    .map(RequestHorse::getHorse)
                    .toList();
        }
        return Collections.emptyList();
    }

    private JobHorseResponse toHorseResponse(Horse h) {
        return JobHorseResponse.builder()
                .id(h.getId())
                .name(h.getName())
                .sex(h.getSex())
                .breed(h.getBreed())
                .weightKg(h.getWeightKg())
                .sizeClassCode(h.getSizeClass() != null ? h.getSizeClass().getCode() : "M")
                .requiredStall(h.getRequiredStall())
                .temperament(h.getTemperament())
                .handlingNotes(h.getHandlingNotes())
                .build();
    }

    private Map<Horse, VehicleStall> solveArrangement(List<Horse> horses, Set<VehicleStall> availableStalls) {
        // Backtracking solver to find a 0-conflict placement
        Map<Horse, VehicleStall> assignment = new HashMap<>();
        if (solveRecursive(0, horses, new ArrayList<>(availableStalls), assignment)) {
            return assignment;
        }
        return null;
    }

    private boolean solveRecursive(int index, List<Horse> horses, List<VehicleStall> stalls, Map<Horse, VehicleStall> current) {
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
            boolean needsBox = (horse.getSex() == HorseSex.STALLION || horse.getSex() == HorseSex.COLT || horse.getTemperament() == Temperament.AGGRESSIVE || horse.getRequiredStall() == StallType.BOX);
            if (needsBox && stall.getStallType() != StallType.BOX) {
                continue;
            }
            if (horse.getRequiredStall() == StallType.CLIMATE && stall.getStallType() != StallType.CLIMATE) {
                continue;
            }
            if (horse.getTemperament() == Temperament.NERVOUS && stall.isNearRamp()) {
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
                    if (stall.getRowNo() == placedStall.getRowNo() || stall.getRowNo() == (placedStall.getRowNo() + 1)) {
                        violatesProximity = true;
                        break;
                    }
                }
                if (isMare && (placedHorse.getSex() == HorseSex.STALLION || placedHorse.getSex() == HorseSex.COLT)) {
                    if (stall.getRowNo() == placedStall.getRowNo() || placedStall.getRowNo() == (stall.getRowNo() + 1)) {
                        violatesProximity = true;
                        break;
                    }
                }
            }

            if (violatesProximity) {
                continue;
            }

            current.put(horse, stall);
            if (solveRecursive(index + 1, horses, stalls, current)) {
                return true;
            }
            current.remove(horse);
        }

        return false;
    }
}
