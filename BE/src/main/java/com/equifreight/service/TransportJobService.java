package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.*;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.LoadPlanRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.TransportJobRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.*;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Log4j2
public class TransportJobService {

    private final TransportJobRepository transportJobRepository;
    private final LoadPlanService loadPlanService;
    private final RoutePlanService routePlanService;
    private final CrewAssignmentService crewAssignmentService;
    private final LoadPlanRepository loadPlanRepository;
    private final RoutePlanRepository routePlanRepository;
    private final CrewAssignmentRepository crewAssignmentRepository;
    private final ClearanceService clearanceService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public TransportJobService(
            TransportJobRepository transportJobRepository,
            LoadPlanService loadPlanService,
            RoutePlanService routePlanService,
            CrewAssignmentService crewAssignmentService,
            LoadPlanRepository loadPlanRepository,
            RoutePlanRepository routePlanRepository,
            CrewAssignmentRepository crewAssignmentRepository,
            ClearanceService clearanceService,
            AuditService auditService,
            NotificationService notificationService) {
        this.transportJobRepository = transportJobRepository;
        this.loadPlanService = loadPlanService;
        this.routePlanService = routePlanService;
        this.crewAssignmentService = crewAssignmentService;
        this.loadPlanRepository = loadPlanRepository;
        this.routePlanRepository = routePlanRepository;
        this.crewAssignmentRepository = crewAssignmentRepository;
        this.clearanceService = clearanceService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public Page<JobSummaryResponse> search(String q, JobStage stage, String filter, Pageable pageable) {
        Specification<TransportJob> spec = (root, cq, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (stage != null) {
                predicates.add(cb.equal(root.get("stage"), stage));
            }

            if (filter != null && !filter.isBlank()) {
                switch (filter.toUpperCase()) {
                    case "BLOCKED" ->
                        predicates.add(cb.notEqual(root.get("dossierStatus"), DossierStatus.CLEARANCE_READY));
                    case "IN_TRANSIT" ->
                        predicates.add(cb.or(
                                cb.equal(root.get("stage"), JobStage.TRIP),
                                cb.equal(root.get("tripStatus"), TripStatus.DEPARTED)));
                    case "NEEDS_ME" ->
                        predicates.add(cb.or(
                                cb.equal(root.get("stage"), JobStage.DOCUMENTS),
                                cb.equal(root.get("stage"), JobStage.CLEARANCE)));
                    default -> {
                        /* ALL - no extra predicate */
                    }
                }
            }

            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("code")), like)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return transportJobRepository.findAll(spec, pageable).map(this::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public JobDetailResponse getJobDetail(UUID id) {
        TransportJob job = transportJobRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + id));

        List<JobHorseResponse> horses = getJobHorses(job);
        LoadPlanResponse loadPlan =
                loadPlanService.getActiveLoadPlan(job.getId()).orElse(null);

        RoutePlanResponse routePlan = null;
        try {
            routePlan = routePlanService.getActiveRoutePlan(job.getId());
        } catch (ResourceNotFoundException e) {
            log.debug("No route plan yet for job {}", job.getCode());
        }

        List<CrewMemberResponse> crew = crewAssignmentService.getCrew(job.getId());

        com.equifreight.model.clearance.ClearanceStatusResponse gate = clearanceService.getClearanceStatus(job.getId());
        boolean isClear = gate.clearanceReady();
        String gateState = isClear ? "Clear" : "Locked";
        String gateSummary;
        if (isClear) {
            gateSummary = "Dossier cleared. Vehicle and trip departure may proceed.";
        } else if (gate.outstandingIssues().isEmpty()) {
            gateSummary = "Clearance gate is locked. Documents are awaiting clearance.";
        } else {
            gateSummary = String.format(
                    "Clearance gate is locked. %d items are outstanding before departure can be recorded.",
                    gate.outstandingIssues().size());
        }

        return JobMapper.toDetailResponse(
                job,
                getBlockingReason(job),
                getNextStepOwner(job),
                gateState,
                gateSummary,
                horses,
                loadPlan,
                routePlan,
                crew);
    }

    @Transactional
    public JobDetailResponse signOffTripPlan(UUID jobId, User currentUser) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        // Only the logistics manager signs off (US-F3-08); enforced once, by @PreAuthorize on the controller.
        if (job.getDepartedAt() != null) {
            throw new BusinessException("Cannot sign off trip plan: the job departed on " + job.getDepartedAt());
        }

        // Clearance gate check: departure gate must be CLEAR (US-F3-08)
        com.equifreight.model.clearance.ClearanceStatusResponse gate = clearanceService.getClearanceStatus(jobId);
        if (!gate.clearanceReady()) {
            throw new BusinessException("Cannot sign off trip plan: clearance gate is locked ("
                    + gate.outstandingIssues().size() + " items outstanding)");
        }

        // Validate load plan confirmed
        Optional<LoadPlan> loadPlanOpt = loadPlanRepository.findFirstByJobIdOrderByCreatedAtDesc(jobId);
        if (loadPlanOpt.isEmpty() || loadPlanOpt.get().getStatus() != LoadPlanStatus.CONFIRMED) {
            throw new BusinessException("Cannot sign off trip plan: Load plan is not confirmed yet");
        }

        // Validate route plan confirmed
        Optional<RoutePlan> routePlanOpt = routePlanRepository.findByJobIdAndStatus(jobId, RoutePlanStatus.CONFIRMED);
        if (routePlanOpt.isEmpty()) {
            throw new BusinessException("Cannot sign off trip plan: Route plan is not confirmed yet");
        }

        // Validate crew assigned: driver and groom ratio
        List<CrewAssignment> crewAssignments = crewAssignmentRepository.findByJobId(jobId);
        if (crewAssignments.isEmpty()) {
            throw new BusinessException("Cannot sign off trip plan: No crew assigned to this job");
        }
        boolean hasDriver = crewAssignments.stream().anyMatch(c -> c.getCrewRole() == CrewRole.DRIVER);
        if (!hasDriver) {
            throw new BusinessException("Cannot sign off trip plan: At least one DRIVER must be assigned");
        }
        int horseCount = job.getRequest() != null && job.getRequest().getHorses() != null
                ? job.getRequest().getHorses().size()
                : 0;
        int reqGrooms = (int) Math.ceil(horseCount / 3.0);
        long groomCount = crewAssignments.stream()
                .filter(c -> c.getCrewRole() == CrewRole.GROOM || c.getCrewRole() == CrewRole.FLYING_GROOM)
                .count();
        if (groomCount < reqGrooms) {
            throw new BusinessException(
                    "Cannot sign off trip plan: Requires " + reqGrooms + " groom(s), found " + groomCount);
        }

        // The confirmed route has set the travel dates by now, so check every crew member is free for them
        // (US-F3-06). Crew assigned before the route was confirmed couldn't be checked then.
        if (job.getPlannedDepartureAt() != null && job.getPlannedArrivalAt() != null) {
            for (CrewAssignment member : crewAssignments) {
                if (!crewAssignmentRepository
                        .findOverlappingAssignments(
                                member.getUser().getId(),
                                job.getId(),
                                job.getPlannedDepartureAt(),
                                job.getPlannedArrivalAt())
                        .isEmpty()) {
                    throw new ConflictException(
                            "CREW_OVERLAP",
                            "Cannot sign off trip plan: "
                                    + member.getUser().getFirstName() + " "
                                    + member.getUser().getLastName()
                                    + " is already on another trip at the same time");
                }
            }
        }

        boolean previouslySignedOff = job.getTripStatus() != com.equifreight.entity.enums.TripStatus.NOT_STARTED
                || auditService.hasAction("TRANSPORT_JOB", job.getId(), "SIGN_OFF_TRIP_PLAN");

        // The stage stays where it is: recording the departure moves the job to TRIP (TripService).
        job.setSignedOffAt(Instant.now());
        job.setSignedOffBy(currentUser);
        transportJobRepository.save(job);

        auditService.recordDecision(
                currentUser,
                "SIGN_OFF_TRIP_PLAN",
                "Logistics manager signed off trip plan for job " + job.getCode(),
                "TRANSPORT_JOB",
                job.getId(),
                job.getCode(),
                null,
                previouslySignedOff ? "SIGNED_OFF" : "NOT_SIGNED_OFF",
                "SIGNED_OFF");

        String notifTitle =
                previouslySignedOff ? "Trip plan updated: " + job.getCode() : "Trip plan signed off: " + job.getCode();
        String notifBody = previouslySignedOff
                ? "The trip plan for job " + job.getCode()
                        + " has been updated and re-signed off. Please re-check the route and stall assignments."
                : "The trip plan for job " + job.getCode() + " has been signed off and released.";

        for (CrewAssignment member : crewAssignments) {
            notificationService.sendNotification(
                    member.getUser(), "TRIP_RELEASED", notifTitle, notifBody, "TRANSPORT_JOB", job.getId());
        }

        log.info("Logistics manager {} signed off trip plan for job {}", currentUser.getEmail(), job.getCode());
        return getJobDetail(jobId);
    }

    private JobSummaryResponse toSummaryResponse(TransportJob job) {
        return JobMapper.toSummaryResponse(job, getJobHorses(job), getBlockingReason(job), getNextStepOwner(job));
    }

    private String getBlockingReason(TransportJob job) {
        if (job.getDossierStatus() != DossierStatus.CLEARANCE_READY) {
            return "Departure locked · clearance pending";
        }
        if (job.getSignedOffAt() == null) {
            return "Sign-off pending";
        }
        return null;
    }

    private String getNextStepOwner(TransportJob job) {
        if (job.getStage() == JobStage.CLOSED) {
            return "Closed";
        }
        if (job.getStage() == JobStage.DOCUMENTS || job.getDossierStatus() != DossierStatus.CLEARANCE_READY) {
            return "Transport specialist";
        }
        Optional<LoadPlan> loadPlanOpt = loadPlanRepository.findFirstByJobIdOrderByCreatedAtDesc(job.getId());
        if (loadPlanOpt.isEmpty() || loadPlanOpt.get().getStatus() != LoadPlanStatus.CONFIRMED) {
            return "Fleet & route coordinator";
        }
        Optional<RoutePlan> routePlanOpt =
                routePlanRepository.findByJobIdAndStatus(job.getId(), RoutePlanStatus.CONFIRMED);
        if (routePlanOpt.isEmpty()) {
            return "Fleet & route coordinator";
        }
        List<CrewAssignment> crew = crewAssignmentRepository.findByJobId(job.getId());
        if (crew.isEmpty() || crew.stream().noneMatch(c -> c.getCrewRole() == CrewRole.DRIVER)) {
            return "Fleet & route coordinator";
        }
        if (job.getSignedOffAt() == null) {
            return "Logistics manager";
        }
        if (job.getStage() == JobStage.TRIP) {
            Optional<CrewAssignment> driver = crew.stream()
                    .filter(c -> c.getCrewRole() == CrewRole.DRIVER)
                    .findFirst();
            return driver.map(d -> "Driver: " + d.getUser().getFirstName() + " "
                            + d.getUser().getLastName())
                    .orElse("Driver");
        }
        return "Logistics manager";
    }

    private List<JobHorseResponse> getJobHorses(TransportJob job) {
        if (job.getRequest() != null && job.getRequest().getHorses() != null) {
            return job.getRequest().getHorses().stream()
                    .map(RequestHorse::getHorse)
                    .map(JobMapper::toHorseResponse)
                    .toList();
        }
        return Collections.emptyList();
    }
}
