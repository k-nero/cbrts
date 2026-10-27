package com.equifreight.service;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.Place;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.CreateRoutePlanRequest;
import com.equifreight.model.job.JourneyCorridorResponse;
import com.equifreight.model.job.SetFlightRequest;
import com.equifreight.model.trip.TripPartResponse;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TripRepository;
import com.equifreight.repository.VehicleBookingRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A job's journey, built by the fleet coordinator one trip at a time (US-F3-21, docs/multi-trip-jobs-design.md).
 * Approval makes no trip: the coordinator adds the first trip from the origin's city, then each next trip from the city
 * where the last one ends, on any catalog corridor touching it, driven or flown either way. A trip that ends short of
 * the destination city hands its horses on at a place there; the next trip collects them from it. Only the last trip is
 * taken off, before it departs. The quotation and invoices don't change.
 */
@Log4j2
@Service
public class JourneyService {

    private final TransportJobRepository jobs;
    private final CorridorRepository corridors;
    private final PlaceRepository places;
    private final TripRepository trips;
    private final RoutePlanRepository routePlanRows;
    private final JobTripService jobTrips;
    private final RoutePlanService routePlans;
    private final LoadPlanService loadPlans;
    private final FlightService flights;
    private final VehicleBookingRepository bookings;
    private final CrewAssignmentRepository crew;
    private final AuditService audit;
    private final Clock clock;

    public JourneyService(
            TransportJobRepository jobs,
            CorridorRepository corridors,
            PlaceRepository places,
            TripRepository trips,
            RoutePlanRepository routePlanRows,
            JobTripService jobTrips,
            RoutePlanService routePlans,
            LoadPlanService loadPlans,
            FlightService flights,
            VehicleBookingRepository bookings,
            CrewAssignmentRepository crew,
            AuditService audit,
            Clock clock) {
        this.jobs = jobs;
        this.corridors = corridors;
        this.places = places;
        this.trips = trips;
        this.routePlanRows = routePlanRows;
        this.jobTrips = jobTrips;
        this.routePlans = routePlans;
        this.loadPlans = loadPlans;
        this.flights = flights;
        this.bookings = bookings;
        this.crew = crew;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * The corridors the next trip of {@code jobId}'s journey can run (US-F3-21): every catalog corridor touching the
     * city the journey has reached, read from that city. Those on the quoted route come first. None once the journey
     * reaches the destination city.
     */
    @Transactional(readOnly = true)
    public List<JourneyCorridorResponse> nextCorridors(UUID jobId) {
        TransportJob job = job(jobId);
        if (complete(job)) return List.of();
        String city = jobTrips.journeyEndCity(job);
        if (city == null) return List.of();
        List<Corridor> quoted = quoted(job.getRequest());
        String destination = destinationCity(job);
        return corridors.findTouchingCity(city).stream()
                .map(c -> {
                    boolean reversed = !c.getOriginCity().equalsIgnoreCase(city);
                    String to = reversed ? c.getOriginCity() : c.getDestinationCity();
                    return new JourneyCorridorResponse(
                            c.getId(),
                            c.getCode(),
                            c.getMode(),
                            reversed,
                            city,
                            to,
                            destination != null && destination.equalsIgnoreCase(to),
                            quoted.stream().anyMatch(q -> q.getId().equals(c.getId())));
                })
                .sorted(Comparator.comparing((JourneyCorridorResponse r) -> !r.quoted())
                        .thenComparing(r -> !r.reachesDestination())
                        .thenComparing(JourneyCorridorResponse::corridorCode))
                .toList();
    }

    /**
     * Adds a trip on {@code corridorId} to the end of {@code jobId}'s journey (US-F3-21), run from the city the journey
     * has reached. The first trip carries every horse of the request from its origin; a later one collects them where
     * the trip before hands them on, and they are planned on it until then. A trip that reaches the destination city
     * delivers there; one that doesn't hands the horses on at the city's airport (or another place there) for the next
     * trip. A road trip's route is a draft to plan; a flight's is confirmed airport to airport, its times to come from
     * the flight.
     */
    @Transactional
    public List<TripPartResponse> addTrip(UUID jobId, UUID corridorId, User user) {
        TransportJob job = job(jobId);
        TransportRequest request = job.getRequest();
        if (complete(job)) {
            throw new BusinessException(
                    "JOURNEY_COMPLETE",
                    job.getCode() + "'s journey already reaches " + destinationCity(job)
                            + ". Take its last trip off to change the route.");
        }
        String city = jobTrips.journeyEndCity(job);
        Corridor corridor =
                corridors.findById(corridorId).orElseThrow(() -> ResourceNotFoundException.of("Corridor", corridorId));
        boolean forward = corridor.getOriginCity().equalsIgnoreCase(city);
        if (!forward && !corridor.getDestinationCity().equalsIgnoreCase(city)) {
            throw new BusinessException(
                    "CORRIDOR_NOT_HERE",
                    corridor.getCode() + " doesn't run from " + city + ", where " + job.getCode()
                            + "'s journey has reached.");
        }
        Instant at = clock.instant();
        List<TripJob> journey = jobTrips.journey(job);
        Trip trip;
        Place from;
        if (journey.isEmpty()) {
            trip = jobTrips.startJourney(job, corridor, !forward, user, at);
            from = request.getOriginPlace();
        } else {
            Trip last = journey.getLast().getTrip();
            trip = jobTrips.newTrip(corridor, !forward, user, at);
            jobTrips.planNext(job, last, trip);
            from = handoverOf(last, job).orElseGet(() -> handoverPlace(city, corridor.getMode(), request));
        }
        boolean delivers = JobTripService.reachesDestination(trip, job);
        Place to =
                delivers ? request.getDestinationPlace() : handoverPlace(trip.endCity(), corridor.getMode(), request);
        if (from == null || to == null) {
            throw new BusinessException(
                    "NO_PLACE",
                    "No place in " + (from == null ? city : trip.endCity())
                            + " to hand the horses over at. Add one to the route catalog first.");
        }
        String reason = job.getCode() + " travels on trip " + trip.getCode();
        routePlans.startRoute(
                trip, job, from, delivers ? RouteStopKind.DELIVERY : RouteStopKind.TRANSFER, to, user, reason);
        job.setSignedOffAt(null);
        job.setSignedOffBy(null);
        jobs.save(job);

        audit.recordDecision(
                user,
                "ADD_TRIP",
                AuditText.fit(job.getCode() + " travels " + trip.startCity() + " → " + trip.endCity() + " on trip "
                        + trip.getCode() + " (" + corridor.getCode() + ")"),
                "TRIP",
                trip.getId(),
                trip.getCode(),
                null,
                null,
                trip.getCode());
        log.info("{} added trip {} on {}", job.getCode(), trip.getCode(), corridor.getCode());
        return jobTrips.describeParts(job, trip.getId());
    }

    /**
     * Takes trip {@code tripId}, the last of {@code jobId}'s journey, off it before it departs (US-F3-21). The job's
     * horses, stops and part on it go; the trip before, if any, keeps handing the horses on, so the journey can carry
     * on another way. A trip nobody else rides is deleted with its route, load plans, bookings and crew; one shared
     * with other jobs reopens without this job.
     */
    @Transactional
    public List<TripPartResponse> removeTrip(UUID jobId, UUID tripId, User user) {
        TransportJob job = job(jobId);
        List<TripJob> journey = jobTrips.journey(job);
        if (journey.isEmpty() || !journey.getLast().getTrip().getId().equals(tripId)) {
            throw new BusinessException(
                    "NOT_LAST_TRIP",
                    "Only the last trip of " + job.getCode()
                            + "'s journey can be taken off; take the trips after it off first.");
        }
        Trip trip = journey.getLast().getTrip();
        if (jobTrips.partDeparted(trip, job)) {
            throw new BusinessException("TRIP_DEPARTED", "Trip " + trip.getCode() + " has departed.");
        }
        boolean first = journey.size() == 1;
        boolean others = jobTrips.jobsOn(trip).stream().anyMatch(j -> !j.getId().equals(job.getId()));
        String reason = "Trip " + trip.getCode() + " taken off " + job.getCode() + "'s journey";
        List<UUID> horses = jobTrips.horsesOn(trip).stream()
                .filter(th -> th.getJob().getId().equals(job.getId()))
                .map(TripHorse::getHorse)
                .map(h -> h.getId())
                .toList();
        if (others) {
            loadPlans.unload(trip, horses);
            loadPlans.reopenTrip(trip, reason);
            routePlans.reopen(trip, reason);
            routePlans.removeJobStops(trip, job);
        }
        if (first) jobTrips.leaveJourney(job, trip);
        else jobTrips.unplan(job, trip);
        if (others) {
            flights.allocate(trip);
        } else {
            bookings.deleteAll(bookings.findByTrip_Id(trip.getId()));
            crew.deleteByTripId(trip.getId());
            trips.deleteTrip(trip.getId());
        }
        TransportJob fresh = job(jobId);
        fresh.setSignedOffAt(null);
        fresh.setSignedOffBy(null);
        jobs.save(fresh);

        audit.recordDecision(
                user,
                "REMOVE_TRIP",
                AuditText.fit(reason),
                "TRANSPORT_JOB",
                fresh.getId(),
                fresh.getCode(),
                null,
                trip.getCode(),
                null);
        log.info("{} no longer travels on trip {}", fresh.getCode(), trip.getCode());
        return jobTrips.describeParts(fresh);
    }

    /**
     * Sets the flight of {@code tripId}, a flight of {@code jobId}'s journey (US-F3-21): the airline, number, aircraft,
     * stall positions and times. Its route is confirmed again as a new version, with the airport-out stops at the
     * departure time and the airport-in stops at the arrival, so the trips before and after are checked against them.
     */
    @Transactional
    public void setFlight(UUID jobId, UUID tripId, SetFlightRequest request, User user) {
        Trip trip = jobTrips.tripOf(jobId, tripId);
        if (trip.getCorridor().isRoad()) {
            throw new BusinessException(
                    "NOT_A_FLIGHT", "Trip " + trip.getCode() + " drives; plan it on the Route view.");
        }
        RoutePlan plan = routePlanRows
                .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT)
                .or(() -> routePlanRows.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .orElseThrow(() -> new BusinessException("Trip " + trip.getCode() + " has no route"));
        if (request.scheduledDepartureAt() != null
                && request.scheduledArrivalAt() != null
                && !request.scheduledArrivalAt().isAfter(request.scheduledDepartureAt())) {
            throw new BusinessException("FLIGHT_TIMES", "The flight lands after it takes off.");
        }
        int airFrom = plan.getLegs().stream()
                .filter(leg -> leg.getMode() == TransportMode.AIR)
                .map(leg -> leg.getFromStop().getSeq())
                .findFirst()
                .map(Short::intValue)
                .orElse(1);
        List<CreateRoutePlanRequest.StopItem> stops = new ArrayList<>();
        for (RouteStop st : plan.getStops()) {
            stops.add(CreateRoutePlanRequest.StopItem.builder()
                    .seq(st.getSeq())
                    .kind(st.getKind())
                    .jobId(st.getJob() == null ? null : st.getJob().getId())
                    .placeId(st.getPlace() == null ? null : st.getPlace().getId())
                    .borderCrossingId(
                            st.getBorderCrossing() == null
                                    ? null
                                    : st.getBorderCrossing().getId())
                    .plannedAt(st.getSeq() <= airFrom ? request.scheduledDepartureAt() : request.scheduledArrivalAt())
                    .plannedStayMin(st.getPlannedStayMin())
                    .details(st.getDetails())
                    .build());
        }
        List<CreateRoutePlanRequest.LegItem> legs = plan.getLegs().stream()
                .map(leg -> CreateRoutePlanRequest.LegItem.builder()
                        .seq(leg.getSeq())
                        .fromStopSeq(leg.getFromStop().getSeq())
                        .toStopSeq(leg.getToStop().getSeq())
                        .mode(leg.getMode())
                        .distanceKm(leg.getDistanceKm())
                        .plannedMin(leg.getPlannedMin())
                        .flight(
                                leg.getMode() != TransportMode.AIR
                                        ? null
                                        : CreateRoutePlanRequest.FlightItem.builder()
                                                .airline(request.airline())
                                                .flightNo(request.flightNo())
                                                .aircraftType(request.aircraftType())
                                                .stallCapacity(request.stallCapacity())
                                                .scheduledDepartureAt(request.scheduledDepartureAt())
                                                .scheduledArrivalAt(request.scheduledArrivalAt())
                                                .allocations(List.of())
                                                .build())
                        .build())
                .toList();
        String reason = "Flight " + request.flightNo() + " set";
        var draft = routePlans.createOrUpdateDraft(
                jobId, tripId, new CreateRoutePlanRequest(null, null, reason, stops, legs), user);
        routePlans.confirmRoutePlan(jobId, tripId, draft.id(), reason, user);
    }

    /**
     * What the job page warns about its journey (US-F3-21): where it ends short of the destination city, and where it
     * differs from the route the customer was quoted, since the price was worked out on that route.
     */
    @Transactional(readOnly = true)
    public List<String> warnings(TransportJob job) {
        List<TripJob> journey = jobTrips.journey(job);
        if (journey.isEmpty()) return List.of();
        List<String> out = new ArrayList<>();
        String destination = destinationCity(job);
        Trip last = journey.getLast().getTrip();
        if (destination != null && !JobTripService.reachesDestination(last, job)) {
            out.add("Ends in " + last.endCity() + "; the horses go to " + destination + ". Add a trip from "
                    + last.endCity() + ".");
        }
        List<Corridor> quoted = quoted(job.getRequest());
        List<Corridor> planned = journey.stream()
                .map(p -> p.getTrip().getCorridor())
                .filter(Objects::nonNull)
                .toList();
        List<String> notQuoted = planned.stream()
                .filter(c -> quoted.stream().noneMatch(q -> q.getId().equals(c.getId())))
                .map(Corridor::getCode)
                .distinct()
                .toList();
        if (!quoted.isEmpty() && !notQuoted.isEmpty()) {
            out.add("Quoted by way of "
                    + String.join(", ", quoted.stream().map(Corridor::getCode).toList())
                    + "; this journey runs " + String.join(", ", notQuoted)
                    + ". The price was worked out on the quoted route.");
        }
        return out;
    }

    /** Whether the journey has reached the destination city: then no trip can be added after it. */
    @Transactional(readOnly = true)
    public boolean complete(TransportJob job) {
        List<TripJob> journey = jobTrips.journey(job);
        return !journey.isEmpty()
                && JobTripService.reachesDestination(journey.getLast().getTrip(), job);
    }

    /** The corridors of the route the customer was quoted, in order: the leg to the hub, the corridor, the leg from it. */
    private static List<Corridor> quoted(TransportRequest request) {
        List<Corridor> out = new ArrayList<>();
        if (request.getFirstLegCorridor() != null) out.add(request.getFirstLegCorridor());
        if (request.getCorridor() != null) out.add(request.getCorridor());
        if (request.getLastLegCorridor() != null) out.add(request.getLastLegCorridor());
        return out;
    }

    private static String destinationCity(TransportJob job) {
        Place destination = job.getRequest().getDestinationPlace();
        return destination == null ? null : destination.getCity();
    }

    /** Where {@code trip}'s route hands {@code job}'s horses on: the place of its TRANSFER stop for the job. */
    private Optional<Place> handoverOf(Trip trip, TransportJob job) {
        return routePlanRows
                .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT)
                .or(() -> routePlanRows.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .flatMap(plan -> plan.getStops().stream()
                        .filter(st -> st.getKind() == RouteStopKind.TRANSFER
                                && st.getJob() != null
                                && st.getJob().getId().equals(job.getId()))
                        .map(RouteStop::getPlace)
                        .filter(Objects::nonNull)
                        .findFirst());
    }

    /**
     * Where horses change trips in {@code city}: its airport or cargo terminal, where a flight meets the trailers, else
     * a quarantine station, else the request's own place when it is in that city, else any place there but a welfare
     * stop. The coordinator can move a road trip's stop on its route.
     */
    private Place handoverPlace(String city, TransportMode mode, TransportRequest request) {
        if (city == null) return null;
        List<Place> inCity = places.findByCityIgnoreCase(city).stream()
                .filter(p -> p.getKind() != PlaceKind.WELFARE_STOP)
                .toList();
        for (PlaceKind kind : List.of(PlaceKind.CARGO_TERMINAL, PlaceKind.AIRPORT, PlaceKind.QUARANTINE)) {
            Optional<Place> found =
                    inCity.stream().filter(p -> p.getKind() == kind).min(Comparator.comparing(Place::getName));
            if (found.isPresent()) return found.get();
        }
        for (Place own : new Place[] {request.getOriginPlace(), request.getDestinationPlace()}) {
            if (own != null && city.equalsIgnoreCase(own.getCity())) return own;
        }
        return inCity.stream().min(Comparator.comparing(Place::getName)).orElse(null);
    }

    private TransportJob job(UUID jobId) {
        return jobs.findById(jobId).orElseThrow(() -> ResourceNotFoundException.of("Job", jobId));
    }
}
