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
    private final JourneyService journeys;
    private final com.equifreight.repository.FlightRepository flightRepository;

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
            JobTripService jobTrips,
            JourneyService journeys,
            com.equifreight.repository.FlightRepository flightRepository) {
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
        this.journeys = journeys;
        this.flightRepository = flightRepository;
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
                    // Not left yet and due to leave in the next 7 days (US-R-01).
                    case "THIS_WEEK" -> {
                        Instant now = Instant.now();
                        predicates.add(cb.between(
                                root.get("plannedDepartureAt"), now, now.plus(java.time.Duration.ofDays(7))));
                        predicates.add(cb.equal(root.get("tripStatus"), TripStatus.NOT_STARTED));
                    }
                    // Closed jobs have left the active boards (US-F6-04); they have their own tab.
                    case "CLOSED" -> predicates.add(cb.equal(root.get("stage"), JobStage.CLOSED));
                    default -> {
                        /* ALL - no extra predicate */
                    }
                }
            }

            if (stage == null && !"CLOSED".equalsIgnoreCase(filter)) {
                predicates.add(cb.notEqual(root.get("stage"), JobStage.CLOSED));
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
        return getJobDetail(id, null);
    }

    /**
     * The job with the plan of {@code tripId}, one trip of its chain (US-F3-16): that trip's load, route, crew and
     * jobs. Its current trip when null.
     */
    @Transactional(readOnly = true)
    public JobDetailResponse getJobDetail(UUID id, UUID tripId) {
        TransportJob job = transportJobRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + id));

        List<JobHorseResponse> horses = getJobHorses(job);
        TripLoadResponse loadPlan =
                loadPlanService.getActiveLoadPlan(job.getId(), tripId).orElse(null);

        RoutePlanResponse routePlan =
                routePlanService.findActiveRoutePlan(job.getId(), tripId).orElse(null);

        List<CrewMemberResponse> crew = crewAssignmentService.getCrew(job.getId(), tripId);

        com.equifreight.model.clearance.ClearanceStatusResponse gate = clearanceService.getClearanceStatus(job.getId());
        Optional<Trip> shown = jobTrips.findTripOf(job.getId(), tripId);
        // A domestic leg before the border leaves before the dossier clears; the gate is on the trip that crosses
        // (US-F2-13).
        boolean domesticLeg = shown.map(t -> jobTrips.beforeBorder(t, job)).orElse(false);
        boolean noTrip = jobTrips.journey(job).isEmpty();
        // With no trip yet nothing can depart, whatever the dossier says (US-F3-21).
        boolean isClear = !noTrip && (gate.clearanceReady() || domesticLeg);
        String gateState = isClear ? "Clear" : "Locked";
        String gateSummary;
        if (noTrip) {
            gateSummary = "No trip planned yet. The fleet coordinator adds the journey's first trip.";
        } else if (domesticLeg && !gate.clearanceReady()) {
            gateSummary = jobTrips.borderTripOf(job)
                    .map(border -> "This leg stays in one country and can depart before the dossier clears. The"
                            + " clearance gate is on " + border.getCode() + ", which crosses the border.")
                    .orElse("This leg stays in one country and can depart before the dossier clears.");
        } else if (isClear) {
            gateSummary = "Dossier cleared. Vehicle and trip departure may proceed.";
        } else if (gate.outstandingIssues().isEmpty()) {
            gateSummary = "Clearance gate is locked. Documents are awaiting clearance.";
        } else {
            gateSummary = String.format(
                    "Clearance gate is locked. %d items are outstanding before departure can be recorded.",
                    gate.outstandingIssues().size());
        }

        // The sign-off is the trip's, recorded on each job's part of it (US-F3-08).
        Optional<com.equifreight.entity.TripJob> signedOff =
                shown.flatMap(trip -> jobTrips.findPartOf(trip, job)).filter(part -> part.getSignedOffAt() != null);
        List<TripJobResponse> tripJobs = shown.map(trip -> jobTrips.jobsOn(trip).stream()
                        .map(JobMapper::toTripJobResponse)
                        .toList())
                .orElse(List.of());
        return JobMapper.toDetailResponse(
                        job,
                        shown.map(Trip::getCode).orElse(null),
                        getBlockingReason(job),
                        getNextStepOwner(job),
                        gateState,
                        gateSummary,
                        horses,
                        loadPlan,
                        routePlan,
                        crew,
                        tripJobs,
                        jobTrips.describeParts(job, tripId))
                .toBuilder()
                .journeyEndCity(jobTrips.journeyEndCity(job))
                .journeyComplete(journeys.complete(job))
                .journeyWarnings(journeys.warnings(job))
                .clearanceJourneyNote(clearanceJourneyNote(job))
                .tripSignedOffAt(signedOff
                        .map(com.equifreight.entity.TripJob::getSignedOffAt)
                        .orElse(null))
                .tripSignedOffBy(signedOff
                        .map(com.equifreight.entity.TripJob::getSignedOffBy)
                        .map(User::displayName)
                        .orElse(null))
                .build();
    }

    /**
     * Which trips of the job's journey the clearance gate holds back (US-F2-13, US-F3-21): the trip that crosses the
     * border and every trip after it; a domestic leg before it can leave first. Null while the job has no trip.
     */
    private String clearanceJourneyNote(TransportJob job) {
        List<com.equifreight.entity.TripJob> journey = jobTrips.journey(job);
        Optional<Trip> border = jobTrips.borderTripOf(job);
        if (journey.isEmpty() || border.isEmpty()) return null;
        List<String> before = new java.util.ArrayList<>();
        for (com.equifreight.entity.TripJob part : journey) {
            Trip t = part.getTrip();
            if (t.getId().equals(border.get().getId())) break;
            before.add(t.getCode() + " (" + t.startCity() + " → " + t.endCity() + ")");
        }
        Trip gated = border.get();
        String what = gated.getCorridor().isRoad() ? "the road trip" : "the flight";
        String note = "Clearance gates " + gated.getCode() + " (" + what + " " + gated.startCity() + " → "
                + gated.endCity() + ")" + (journey.size() > before.size() + 1 ? " and every trip after it." : ".");
        if (!before.isEmpty()) note += " " + String.join(", ", before) + " can leave before.";
        return note;
    }

    /**
     * The job an approved request becomes (US-F1-07, BR-F1-05): its CBRT code from the code counter, the accepted
     * quotation it is held to, the manager who approved it and the team they chose, with the request's arrival window.
     * It has no trip until the fleet coordinator adds one (US-F3-21). The caller has checked the request and the team;
     * the dates are planned in Flow 3.
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
        // No trip yet: the coordinator builds the journey one trip at a time on the job's Trip tab (US-F3-21).
        return transportJobRepository.saveAndFlush(job);
    }

    @Transactional
    public JobDetailResponse signOffTripPlan(UUID jobId, User currentUser) {
        return signOffTripPlan(jobId, null, currentUser);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional
    public JobDetailResponse signOffTripPlan(UUID jobId, UUID tripId, User currentUser) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        // Only the logistics manager signs off (US-F3-08); enforced once, by @PreAuthorize on the controller.
        // Clearance gate check: every job on the trip must be CLEAR (US-F3-08, US-F3-11), except on a domestic leg
        // before the border, which leaves before the dossier clears (US-F2-13).
        Trip trip = jobTrips.tripOf(jobId, tripId);
        if (jobTrips.partDeparted(trip, job)) {
            throw new BusinessException("Cannot sign off trip plan: the job departed on " + job.getDepartedAt());
        }
        List<TransportJob> jobsOnTrip = jobTrips.jobsOn(trip);
        if (jobsOnTrip.isEmpty()) jobsOnTrip = List.of(job);
        for (TransportJob onTrip : jobsOnTrip) {
            if (jobTrips.beforeBorder(trip, onTrip)) continue;
            com.equifreight.model.clearance.ClearanceStatusResponse gate =
                    clearanceService.getClearanceStatus(onTrip.getId());
            if (!gate.clearanceReady()) {
                throw new BusinessException("Cannot sign off trip plan: clearance gate is locked"
                        + (onTrip.getId().equals(jobId) ? "" : " for " + onTrip.getCode())
                        + " (" + gate.outstandingIssues().size() + " items outstanding)"
                        + (onTrip.getId().equals(jobId) ? "" : ". Take it off the trip so the others can leave."));
            }
        }

        // The journey must reach the destination city before any trip of it is signed off (US-F3-21).
        for (TransportJob onTrip : jobsOnTrip) {
            List<com.equifreight.entity.TripJob> journey = jobTrips.journey(onTrip);
            Trip last = journey.isEmpty() ? trip : journey.getLast().getTrip();
            if (!JobTripService.reachesDestination(last, onTrip)) {
                throw new BusinessException(
                        "JOURNEY_SHORT",
                        "Cannot sign off trip plan: " + onTrip.getCode()
                                + "'s journey ends in " + last.endCity() + "; the horses go to "
                                + onTrip.getRequest().getDestinationPlace().getCity() + ". Add the trip there first.");
            }
        }

        // Validate route plan confirmed
        Optional<RoutePlan> routePlanOpt =
                routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED);
        if (routePlanOpt.isEmpty()) {
            throw new BusinessException("Cannot sign off trip plan: Route plan is not confirmed yet");
        }

        // Validate the trip's load plans confirmed. A trip that only flies (a flight of a job's chain, US-F3-16) has
        // its flight as its carrier: no trailer, so no load plan or driver.
        boolean drives = routePlanOpt.get().getLegs().stream()
                .anyMatch(leg -> leg.getMode() == com.equifreight.entity.enums.TransportMode.ROAD);
        List<LoadPlan> loadPlans = loadPlanRepository.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId());
        if ((drives && loadPlans.isEmpty())
                || loadPlans.stream().anyMatch(p -> p.getStatus() != LoadPlanStatus.CONFIRMED)) {
            throw new BusinessException("Cannot sign off trip plan: Load plan is not confirmed yet");
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
        // A flight of the journey is signed off once the airline's flight and its times are set (US-F3-21).
        for (com.equifreight.entity.RouteLeg leg : routePlanOpt.get().getLegs()) {
            if (leg.getMode() != com.equifreight.entity.enums.TransportMode.AIR) continue;
            boolean timed = flightRepository
                    .findByRouteLegId(leg.getId())
                    .map(f -> f.getScheduledDepartureAt() != null && f.getScheduledArrivalAt() != null)
                    .orElse(false);
            if (!timed) {
                throw new BusinessException(
                        "FLIGHT_TIMES", "Cannot sign off trip plan: enter the flight and its times first.");
            }
        }
        // A trip that flies needs its flight crew too, counted for every horse on board (US-F3-15).
        String flightCrew = crewAssignmentService.flightCrewShortfall(trip, routePlanOpt.get(), crewAssignments);
        if (flightCrew != null) {
            throw new BusinessException("Cannot sign off trip plan: " + flightCrew);
        }

        // The confirmed route has set the trip's times by now, so check every crew member is free for them
        // (US-F3-06). Crew assigned before the route was confirmed couldn't be checked then.
        for (CrewAssignment member : crewAssignments) {
            if (crewAssignmentService
                    .overlapping(member.getUser().getId(), trip)
                    .isPresent()) {
                throw new ConflictException(
                        "CREW_OVERLAP",
                        "Cannot sign off trip plan: "
                                + member.getUser().getFirstName() + " "
                                + member.getUser().getLastName()
                                + " is already on another trip at the same time");
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
        // Each job's part on this trip is what departs; a job split by an incident is signed off per part (US-F5-06).
        jobTrips.signOff(trip, currentUser, signedOffAt);

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
        return getJobDetail(jobId, tripId);
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
