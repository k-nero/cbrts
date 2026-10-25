package com.equifreight.service;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripVehicle;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CrewRole;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.AssignCrewRequest;
import com.equifreight.model.job.CrewMemberResponse;
import com.equifreight.model.job.JobMapper;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.LoadPlanRepository;
import com.equifreight.repository.LoadPlanStallRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Log4j2
public class CrewAssignmentService {

    private final CrewAssignmentRepository crewAssignmentRepository;
    private final TransportJobRepository transportJobRepository;
    private final UserRepository userRepository;
    private final JobTripService jobTrips;
    private final LoadPlanRepository loadPlanRepository;
    private final LoadPlanStallRepository loadPlanStallRepository;
    private final AuditService auditService;
    private final FlightService flights;
    private final RoutePlanRepository routePlans;

    public CrewAssignmentService(
            CrewAssignmentRepository crewAssignmentRepository,
            TransportJobRepository transportJobRepository,
            UserRepository userRepository,
            JobTripService jobTrips,
            LoadPlanRepository loadPlanRepository,
            LoadPlanStallRepository loadPlanStallRepository,
            AuditService auditService,
            FlightService flights,
            RoutePlanRepository routePlans) {
        this.crewAssignmentRepository = crewAssignmentRepository;
        this.transportJobRepository = transportJobRepository;
        this.userRepository = userRepository;
        this.jobTrips = jobTrips;
        this.loadPlanRepository = loadPlanRepository;
        this.loadPlanStallRepository = loadPlanStallRepository;
        this.auditService = auditService;
        this.flights = flights;
        this.routePlans = routePlans;
    }

    /** When a trip travels: from its first planned time to its last. */
    private record Span(Instant from, Instant to) {
        boolean overlaps(Span other) {
            return from.isBefore(other.to) && to.isAfter(other.from);
        }
    }

    /**
     * When {@code trip} travels (US-F3-06): from its route's first planned stop to its last (plus that stop's stay),
     * on the confirmed route, else the draft. Without planned times, the planned departure and arrival of the jobs on
     * it, which for a job travelling on a chain of trips (US-F3-16) is its whole journey. Empty when nothing is
     * planned yet.
     */
    private Optional<Span> spanOf(Trip trip) {
        Optional<Span> route = routePlans
                .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED)
                .or(() -> routePlans.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT))
                .flatMap(plan -> {
                    List<RouteStop> timed = plan.getStops().stream()
                            .filter(st -> st.getPlannedAt() != null)
                            .toList();
                    if (timed.size() < 2) return Optional.empty();
                    RouteStop last = timed.getLast();
                    Instant end = last.getPlannedStayMin() == null
                            ? last.getPlannedAt()
                            : last.getPlannedAt().plus(Duration.ofMinutes(last.getPlannedStayMin()));
                    return Optional.of(new Span(timed.getFirst().getPlannedAt(), end));
                });
        if (route.isPresent()) return route;
        Instant from = null;
        Instant to = null;
        for (TransportJob job : jobTrips.jobsOn(trip)) {
            if (job.getPlannedDepartureAt() == null || job.getPlannedArrivalAt() == null) continue;
            if (from == null || job.getPlannedDepartureAt().isBefore(from)) from = job.getPlannedDepartureAt();
            if (to == null || job.getPlannedArrivalAt().isAfter(to)) to = job.getPlannedArrivalAt();
        }
        return from == null ? Optional.empty() : Optional.of(new Span(from, to));
    }

    /**
     * The user's crew assignment on another trip that travels while {@code trip} does (US-F3-06); empty while
     * {@code trip}'s times aren't planned. Each trip is compared on its own span, so a groom who rides the trailer to
     * the airport can fly with the horses on the next trip of their journey.
     */
    @Transactional(readOnly = true)
    public Optional<CrewAssignment> overlapping(UUID userId, Trip trip) {
        Optional<Span> span = spanOf(trip);
        if (span.isEmpty()) return Optional.empty();
        return crewAssignmentRepository.findOnOtherOpenTrips(userId, trip.getId()).stream()
                .filter(other ->
                        spanOf(other.getTrip()).map(span.get()::overlaps).orElse(false))
                .findFirst();
    }

    @Transactional(readOnly = true)
    public List<CrewMemberResponse> getCrew(UUID jobId) {
        return getCrew(jobId, null);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional(readOnly = true)
    public List<CrewMemberResponse> getCrew(UUID jobId, UUID tripId) {
        return jobTrips.findTripOf(jobId, tripId)
                .map(trip -> crewAssignmentRepository.findByTrip_Id(trip.getId()).stream()
                        .map(JobMapper::toCrewMemberResponse)
                        .toList())
                .orElse(List.of());
    }

    /**
     * The horses a trailer's grooms look after: every horse on the trip while it has one trailer, else the horses
     * placed on that trailer's load plan.
     */
    @Transactional(readOnly = true)
    public int horsesOn(Trip trip, TripVehicle tripVehicle, int trailers) {
        if (trailers <= 1) {
            return jobTrips.horsesOn(trip).size();
        }
        return loadPlanRepository
                .findByTripVehicle_Id(tripVehicle.getId())
                .map(plan ->
                        loadPlanStallRepository.findByLoadPlanId(plan.getId()).size())
                .orElse(0);
    }

    @Transactional
    public List<CrewMemberResponse> assignCrew(UUID jobId, AssignCrewRequest request, User currentUser) {
        return assignCrew(jobId, null, request, currentUser);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional
    public List<CrewMemberResponse> assignCrew(UUID jobId, UUID tripId, AssignCrewRequest request, User currentUser) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        // The crew can change until departure; a change after sign-off clears it, so it needs a new one (US-F3-08).
        Trip trip = jobTrips.tripOf(jobId, tripId);
        if (jobTrips.partDeparted(trip, job)) {
            throw new BusinessException("Cannot modify crew assignments: the job departed on " + job.getDepartedAt());
        }
        if (request.flight()) {
            return assignFlightCrew(job, trip, request, currentUser);
        }
        // The crew travels with a trailer, so the load plan names it first; in a convoy, say which (US-F3-10).
        List<TripVehicle> trailers = jobTrips.vehiclesOf(trip);
        if (trailers.isEmpty()) {
            throw new BusinessException(
                    "Choose the vehicle on the Load plan tab first: the crew is assigned to a vehicle");
        }
        TripVehicle tripVehicle;
        if (request.tripVehicleId() != null) {
            tripVehicle = trailers.stream()
                    .filter(tv -> tv.getId().equals(request.tripVehicleId()))
                    .findFirst()
                    .orElseThrow(() -> ResourceNotFoundException.of("Trailer on this trip", request.tripVehicleId()));
        } else if (trailers.size() == 1) {
            tripVehicle = trailers.getFirst();
        } else {
            throw new BusinessException(
                    "The trip has " + trailers.size() + " trailers: say which one this crew is for");
        }
        // One person rides one trailer of the convoy.
        Set<UUID> onOtherTrailers = crewAssignmentRepository.findByTrip_Id(trip.getId()).stream()
                .filter(c -> c.getTripVehicle() != null
                        && !c.getTripVehicle().getId().equals(tripVehicle.getId()))
                .map(c -> c.getUser().getId())
                .collect(java.util.stream.Collectors.toSet());

        // Duplicate check
        Set<UUID> seenUserIds = new HashSet<>();
        for (AssignCrewRequest.CrewItem item : request.crew()) {
            if (!seenUserIds.add(item.userId())) {
                throw new BusinessException("Duplicate crew member in assignment: " + item.userId());
            }
        }

        int horseCount = horsesOn(trip, tripVehicle, trailers.size());

        // BR: Grooms = ⌈horses on the trailer ÷ 3⌉
        int requiredGrooms = (int) Math.ceil(horseCount / 3.0);
        long groomCount = request.crew().stream()
                .filter(c -> c.crewRole() == CrewRole.GROOM || c.crewRole() == CrewRole.FLYING_GROOM)
                .count();

        if (groomCount < requiredGrooms) {
            throw new BusinessException("At least " + requiredGrooms + " groom(s) required for " + horseCount
                    + " horses (1 per 3 horses, rounded up). Found " + groomCount);
        }

        // Overlaps can only be checked once the route has the trip's times; until then they are checked again at
        // sign-off (TransportJobService.signOffTripPlan).
        List<CrewAssignment> assignments = new ArrayList<>();
        for (AssignCrewRequest.CrewItem item : request.crew()) {
            User user = crewMember(item, trip);

            if (onOtherTrailers.contains(user.getId())) {
                throw new BusinessException(
                        user.getFirstName() + " " + user.getLastName() + " is already on another trailer of this trip");
            }

            CrewAssignment ca = new CrewAssignment();
            ca.setTrip(trip);
            ca.setTripVehicle(tripVehicle);
            ca.setUser(user);
            ca.setCrewRole(item.crewRole());
            assignments.add(ca);
        }

        crewAssignmentRepository.deleteByTripVehicleId(tripVehicle.getId());
        List<CrewAssignment> saved = crewAssignmentRepository.saveAll(assignments);

        // Invalidate prior sign-off when crew changes
        job.setSignedOffAt(null);
        job.setSignedOffBy(null);
        jobTrips.clearSignOff(trip);
        transportJobRepository.save(job);

        auditService.recordDecision(
                currentUser,
                "ASSIGN_CREW",
                "Assigned " + saved.size() + " crew members to job " + job.getCode(),
                "TRANSPORT_JOB",
                job.getId(),
                job.getCode(),
                null,
                null,
                "CREW_ASSIGNED");

        log.info("Assigned {} crew members to job {}", saved.size(), job.getCode());
        return saved.stream().map(JobMapper::toCrewMemberResponse).toList();
    }

    /**
     * The crew member {@code item} names, once checked: an escort whose kind fits the role, free for the trip's
     * times when they are known (US-F3-06).
     */
    private User crewMember(AssignCrewRequest.CrewItem item, Trip trip) {
        User user = userRepository
                .findById(item.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + item.userId()));

        // Role check: User must have ESCORT role
        boolean isEscort = user.getRoles() != null
                && user.getRoles().stream()
                        .anyMatch(r ->
                                "ESCORT".equalsIgnoreCase(r.getName()) || "ROLE_ESCORT".equalsIgnoreCase(r.getName()));
        if (!isEscort) {
            throw new BusinessException("User " + user.getEmail() + " does not have the ESCORT role");
        }

        // Escort kind matching check if kind is set
        if (user.getEscortKind() != null) {
            if (item.crewRole() == CrewRole.DRIVER
                    && user.getEscortKind() == com.equifreight.entity.enums.EscortKind.GROOM) {
                throw new BusinessException(
                        "User " + user.getEmail() + " is registered as a GROOM and cannot be assigned as a DRIVER");
            }
            if ((item.crewRole() == CrewRole.GROOM || item.crewRole() == CrewRole.FLYING_GROOM)
                    && user.getEscortKind() == com.equifreight.entity.enums.EscortKind.DRIVER) {
                throw new BusinessException(
                        "User " + user.getEmail() + " is registered as a DRIVER and cannot be assigned as a GROOM");
            }
        }

        // Overlapping jobs check (US-F3-06)
        if (overlapping(user.getId(), trip).isPresent()) {
            throw new ConflictException(
                    "CREW_OVERLAP",
                    "Crew member " + user.getFirstName() + " " + user.getLastName()
                            + " is already assigned to another overlapping trip");
        }
        return user;
    }

    /**
     * The trip's flight crew (US-F3-15): flying grooms, one per three horses on the flight, and the flight vet. They
     * look after every horse on board, whichever job it is on; the person may also ride a trailer to the airport.
     */
    private List<CrewMemberResponse> assignFlightCrew(
            TransportJob job, Trip trip, AssignCrewRequest request, User currentUser) {
        boolean flies = flights.currentRoute(trip)
                .map(route -> !flights.flightsOf(route).isEmpty())
                .orElse(false);
        if (!flies) {
            throw new BusinessException("Trip " + trip.getCode() + " has no flight: plan its air leg first");
        }
        Set<UUID> seen = new HashSet<>();
        for (AssignCrewRequest.CrewItem item : request.crew()) {
            if (!seen.add(item.userId())) {
                throw new BusinessException("Duplicate crew member in assignment: " + item.userId());
            }
            if (item.crewRole() != CrewRole.FLYING_GROOM && item.crewRole() != CrewRole.VET) {
                throw new BusinessException("The flight crew is flying grooms and the flight vet");
            }
        }
        int horses = jobTrips.horsesOn(trip).size();
        int requiredGrooms = (int) Math.ceil(horses / 3.0);
        long flyingGrooms = request.crew().stream()
                .filter(c -> c.crewRole() == CrewRole.FLYING_GROOM)
                .count();
        if (flyingGrooms < requiredGrooms) {
            throw new BusinessException("At least " + requiredGrooms + " flying groom(s) required for " + horses
                    + " horses on the flight (1 per 3 horses, rounded up). Found " + flyingGrooms);
        }
        List<CrewAssignment> assignments = new ArrayList<>();
        for (AssignCrewRequest.CrewItem item : request.crew()) {
            CrewAssignment ca = new CrewAssignment();
            ca.setTrip(trip);
            ca.setUser(crewMember(item, trip));
            ca.setCrewRole(item.crewRole());
            assignments.add(ca);
        }
        crewAssignmentRepository.deleteFlightCrew(trip.getId());
        List<CrewAssignment> saved = crewAssignmentRepository.saveAll(assignments);
        job.setSignedOffAt(null);
        job.setSignedOffBy(null);
        jobTrips.clearSignOff(trip);
        transportJobRepository.save(job);
        auditService.recordDecision(
                currentUser,
                "ASSIGN_FLIGHT_CREW",
                "Assigned " + saved.size() + " flight crew members to trip " + trip.getCode() + " (" + job.getCode()
                        + ")",
                "TRANSPORT_JOB",
                job.getId(),
                job.getCode(),
                null,
                null,
                "FLIGHT_CREW_ASSIGNED");
        return saved.stream().map(JobMapper::toCrewMemberResponse).toList();
    }

    /** What the trip's flight crew lacks for sign-off, or null (US-F3-15). */
    public String flightCrewShortfall(Trip trip, RoutePlan confirmed, List<CrewAssignment> crew) {
        return flights.flightCrewShortfall(trip, confirmed, crew);
    }
}
