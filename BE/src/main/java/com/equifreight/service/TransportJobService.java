package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.*;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.*;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.*;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.LoadPlanRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import jakarta.persistence.criteria.JoinType;
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
    private final CodeService codeService;
    private final JobTripService jobTrips;

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
            NotificationService notificationService,
            CodeService codeService,
            JobTripService jobTrips) {
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
        this.codeService = codeService;
        this.jobTrips = jobTrips;
    }

    @Transactional(readOnly = true)
    public Page<JobSummaryResponse> search(String q, JobStage stage, String filter, Pageable pageable) {
        Specification<TransportJob> spec = (root, cq, cb) -> {
            var predicates = new ArrayList<Predicate>();
            // The team's names are on every row; fetched with the page, not one lookup per row. The count
            // query has no fetches.
            if (cq != null && cq.getResultType() != Long.class && cq.getResultType() != long.class) {
                root.fetch("transportSpecialist", JoinType.LEFT);
                root.fetch("coordinator", JoinType.LEFT);
            }

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
        TripLoadResponse loadPlan =
                loadPlanService.getActiveLoadPlan(job.getId()).orElse(null);

        RoutePlanResponse routePlan =
                routePlanService.findActiveRoutePlan(job.getId()).orElse(null);

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

        List<TripJobResponse> tripJobs = jobTrips.findTripOf(job.getId())
                .map(trip -> jobTrips.jobsOn(trip).stream()
                        .map(JobMapper::toTripJobResponse)
                        .toList())
                .orElse(List.of());
        return JobMapper.toDetailResponse(
                job,
                jobTrips.findTripOf(job.getId()).map(Trip::getCode).orElse(null),
                getBlockingReason(job),
                getNextStepOwner(job),
                gateState,
                gateSummary,
                horses,
                loadPlan,
                routePlan,
                crew,
                tripJobs);
    }

    /**
     * The job an approved request becomes (US-F1-07, BR-F1-05): its CBRT code from the code counter, the accepted
     * quotation it is held to, the manager who approved it and the team they chose, with the request's arrival window.
     * It travels on a trip of its own, with all its horses (US-F3-09). The caller has checked the request and the
     * team; the dates are planned in Flow 3.
     */
    @Transactional
    public TransportJob createApproved(
            TransportRequest request,
            Quotation accepted,
            User manager,
            User specialist,
            User coordinator,
            Instant approvedAt) {
        TransportJob job = new TransportJob();
        job.setCode(codeService.next(
                CodePrefix.CBRT, approvedAt.atZone(BusinessTime.ZONE).getYear()));
        job.setRequest(request);
        job.setQuotation(accepted);
        job.setApprovedBy(manager);
        job.setApprovedAt(approvedAt);
        job.setTransportSpecialist(specialist);
        job.setCoordinator(coordinator);
        job.setWindowStart(request.getWindowStart());
        job.setWindowEnd(request.getWindowEnd());
        TransportJob saved = transportJobRepository.saveAndFlush(job);
        jobTrips.createForJob(saved, manager, approvedAt);
        return saved;
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

        // Clearance gate check: every job on the trip must be CLEAR (US-F3-08, US-F3-11)
        Trip trip = jobTrips.tripOf(jobId);
        List<TransportJob> jobsOnTrip = jobTrips.jobsOn(trip);
        if (jobsOnTrip.isEmpty()) jobsOnTrip = List.of(job);
        for (TransportJob onTrip : jobsOnTrip) {
            com.equifreight.model.clearance.ClearanceStatusResponse gate =
                    clearanceService.getClearanceStatus(onTrip.getId());
            if (!gate.clearanceReady()) {
                throw new BusinessException("Cannot sign off trip plan: clearance gate is locked"
                        + (onTrip.getId().equals(jobId) ? "" : " for " + onTrip.getCode())
                        + " (" + gate.outstandingIssues().size() + " items outstanding)"
                        + (onTrip.getId().equals(jobId) ? "" : ". Take it off the trip so the others can leave."));
            }
        }

        // Validate the trip's load plans confirmed
        List<LoadPlan> loadPlans = loadPlanRepository.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId());
        if (loadPlans.isEmpty() || loadPlans.stream().anyMatch(p -> p.getStatus() != LoadPlanStatus.CONFIRMED)) {
            throw new BusinessException("Cannot sign off trip plan: Load plan is not confirmed yet");
        }

        // Validate route plan confirmed
        Optional<RoutePlan> routePlanOpt =
                routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED);
        if (routePlanOpt.isEmpty()) {
            throw new BusinessException("Cannot sign off trip plan: Route plan is not confirmed yet");
        }

        // Validate crew assigned: driver and groom ratio
        List<CrewAssignment> crewAssignments = crewAssignmentRepository.findByTrip_Id(trip.getId());
        if (crewAssignments.isEmpty()) {
            throw new BusinessException("Cannot sign off trip plan: No crew assigned to this job");
        }
        // Every trailer has a driver and a groom per three horses on it (US-F3-10).
        for (LoadPlan plan : loadPlans) {
            TripVehicle trailer = plan.getTripVehicle();
            String vehicleCode = trailer.getVehicle().getCode();
            List<CrewAssignment> onTrailer = crewAssignments.stream()
                    .filter(c -> c.getTripVehicle() != null
                            && c.getTripVehicle().getId().equals(trailer.getId()))
                    .toList();
            if (onTrailer.stream().noneMatch(c -> c.getCrewRole() == CrewRole.DRIVER)) {
                throw new BusinessException(
                        "Cannot sign off trip plan: At least one DRIVER must be assigned to " + vehicleCode);
            }
            int horseCount = crewAssignmentService.horsesOn(trip, trailer, loadPlans.size());
            int reqGrooms = (int) Math.ceil(horseCount / 3.0);
            long groomCount = onTrailer.stream()
                    .filter(c -> c.getCrewRole() == CrewRole.GROOM || c.getCrewRole() == CrewRole.FLYING_GROOM)
                    .count();
            if (groomCount < reqGrooms) {
                throw new BusinessException("Cannot sign off trip plan: " + vehicleCode + " requires " + reqGrooms
                        + " groom(s), found " + groomCount);
            }
        }
        // A trip that flies needs its flight crew too, counted for every horse on board (US-F3-15).
        String flightCrew = crewAssignmentService.flightCrewShortfall(trip, routePlanOpt.get(), crewAssignments);
        if (flightCrew != null) {
            throw new BusinessException("Cannot sign off trip plan: " + flightCrew);
        }

        // The confirmed route has set the travel dates by now, so check every crew member is free for them
        // (US-F3-06). Crew assigned before the route was confirmed couldn't be checked then.
        if (job.getPlannedDepartureAt() != null && job.getPlannedArrivalAt() != null) {
            for (CrewAssignment member : crewAssignments) {
                if (!crewAssignmentRepository
                        .findOverlappingAssignments(
                                member.getUser().getId(),
                                trip.getId(),
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
        // The plan is the trip's, so the sign-off covers every job on it.
        Instant signedOffAt = Instant.now();
        for (TransportJob onTrip : jobsOnTrip) {
            onTrip.setSignedOffAt(signedOffAt);
            onTrip.setSignedOffBy(currentUser);
            transportJobRepository.save(onTrip);
        }

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

        notificationService.notify(
                NotificationKind.TRIP_RELEASED,
                Audience.escorts(
                        crewAssignments.stream().map(CrewAssignment::getUser).toList()),
                Subject.job(job),
                notifTitle,
                notifBody);

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
        Optional<Trip> trip = jobTrips.findTripOf(job.getId());
        if (trip.isEmpty()) {
            return "Fleet & route coordinator";
        }
        UUID tripId = trip.get().getId();
        List<LoadPlan> loadPlans = loadPlanRepository.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(tripId);
        if (loadPlans.isEmpty() || loadPlans.stream().anyMatch(p -> p.getStatus() != LoadPlanStatus.CONFIRMED)) {
            return "Fleet & route coordinator";
        }
        Optional<RoutePlan> routePlanOpt =
                routePlanRepository.findByTrip_IdAndStatus(tripId, RoutePlanStatus.CONFIRMED);
        if (routePlanOpt.isEmpty()) {
            return "Fleet & route coordinator";
        }
        List<CrewAssignment> crew = crewAssignmentRepository.findByTrip_Id(tripId);
        boolean everyTrailerHasADriver = loadPlans.stream()
                .allMatch(p -> crew.stream()
                        .anyMatch(c -> c.getCrewRole() == CrewRole.DRIVER
                                && c.getTripVehicle() != null
                                && c.getTripVehicle()
                                        .getId()
                                        .equals(p.getTripVehicle().getId())));
        if (!everyTrailerHasADriver) {
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
