package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Place;
import com.equifreight.entity.QuarantinePeriod;
import com.equifreight.entity.RouteLeg;
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
import com.equifreight.model.job.JourneyCorridorResponse.QuarantineStation;
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
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
    private final PlanningDefaults defaults;
    private final QuarantineRules quarantineRules;
    private final ClearanceService clearance;
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
            PlanningDefaults defaults,
            QuarantineRules quarantineRules,
            ClearanceService clearance,
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
        this.defaults = defaults;
        this.quarantineRules = quarantineRules;
        this.clearance = clearance;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * The corridors the next trip of {@code jobId}'s journey can run (US-F3-21): every catalog corridor touching the
     * city the journey has reached, read from that city. Those on the quoted route come first. None once the journey
     * reaches the destination city. A trip that doesn't deliver offers the quarantine stations in the city it ends in,
     * where the job has a quarantine scheduled, to end at (US-F3-22).
     */
    @Transactional(readOnly = true)
    public List<JourneyCorridorResponse> nextCorridors(UUID jobId) {
        TransportJob job = job(jobId);
        if (complete(job)) return List.of();
        String city = jobTrips.journeyEndCity(job);
        if (city == null) return List.of();
        List<Corridor> quoted = quoted(job.getRequest());
        String destination = destinationCity(job);
        List<QuarantinePeriod> held = quarantineRules.heldFor(job);
        List<TripJob> journey = held.isEmpty() ? List.of() : jobTrips.journey(job);
        Place from = journey.isEmpty()
                ? null
                : handoverOf(journey.getLast().getTrip(), job).orElse(null);
        return corridors.findTouchingCity(city).stream()
                .map(c -> {
                    boolean reversed = !c.getOriginCity().equalsIgnoreCase(city);
                    String to = reversed ? c.getOriginCity() : c.getDestinationCity();
                    boolean delivers = JobTripService.reachesDestination(probe(c, reversed), job);
                    return new JourneyCorridorResponse(
                            c.getId(),
                            c.getCode(),
                            c.getMode(),
                            reversed,
                            city,
                            to,
                            destination != null && destination.equalsIgnoreCase(to),
                            quoted.stream().anyMatch(q -> q.getId().equals(c.getId())),
                            delivers || !c.isRoad() ? List.of() : stationsIn(held, to, from));
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
        return addTrip(jobId, corridorId, null, user);
    }

    /**
     * Adds a trip as {@link #addTrip(UUID, UUID, User)} does; with {@code quarantinePlaceId}, a road trip that doesn't
     * deliver ends at that quarantine station instead, where the job has a quarantine scheduled in the city the trip
     * ends in, and the next trip collects the horses there (US-F3-22). Route confirmation then holds both trips to the
     * quarantine's dates.
     */
    @Transactional
    public List<TripPartResponse> addTrip(UUID jobId, UUID corridorId, UUID quarantinePlaceId, User user) {
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
        Place station = quarantinePlaceId == null ? null : stationFor(job, corridor, !forward, quarantinePlaceId);
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
            from = handoverOf(last, job).orElseGet(() -> handoverPlace(city, request, null));
        }
        boolean delivers = JobTripService.reachesDestination(trip, job);
        Place to = delivers
                ? request.getDestinationPlace()
                : station != null ? station : handoverPlace(trip.endCity(), request, from);
        if (from == null || to == null) {
            throw new BusinessException(
                    "NO_PLACE",
                    "No place in " + (from == null ? city : trip.endCity())
                            + " to hand the horses over at. Add one to the route catalog first.");
        }
        String reason = job.getCode() + " travels on trip " + trip.getCode()
                + (station == null ? "" : " to quarantine at " + station.getName());
        routePlans.startRoute(
                trip, job, from, delivers ? RouteStopKind.DELIVERY : RouteStopKind.TRANSFER, to, user, reason);
        job.setSignedOffAt(null);
        job.setSignedOffBy(null);
        jobs.save(job);

        audit.recordDecision(
                user,
                "ADD_TRIP",
                AuditText.fit(job.getCode() + " travels " + trip.startCity() + " → " + trip.endCity() + " on trip "
                        + trip.getCode() + " (" + corridor.getCode() + ")"
                        + (station == null ? "" : ", to quarantine at " + station.getName())),
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
        // The run to the terminal is fitted first, so the flight's route is checked against its new times.
        retimeAround(jobId, trip, request, true, user);
        var draft = routePlans.createOrUpdateDraft(
                jobId, tripId, new CreateRoutePlanRequest(null, null, reason, stops, legs), user);
        routePlans.confirmRoutePlan(jobId, tripId, draft.id(), reason, user);
        retimeAround(jobId, trip, request, false, user);
    }

    /**
     * Fits a road trip beside a flight being set to its times, while it is a draft: with {@code toTerminal}, the local run
     * before it, to reach the cargo terminal the planning settings' hours before take-off; otherwise the trip after it,
     * to collect the horses those hours after landing, once released. A confirmed route is left for the coordinator to
     * change.
     */
    private void retimeAround(UUID jobId, Trip flight, SetFlightRequest request, boolean toTerminal, User user) {
        List<TripJob> journey = jobTrips.journey(job(jobId));
        int at = -1;
        for (int i = 0; i < journey.size(); i++) {
            if (journey.get(i).getTrip().getId().equals(flight.getId())) at = i;
        }
        if (at < 0) return;
        PlanningDefaults.Planning planning = defaults.current();
        if (toTerminal && at > 0 && request.scheduledDepartureAt() != null) {
            Trip before = journey.get(at - 1).getTrip();
            Instant reach = request.scheduledDepartureAt().minus(Duration.ofHours(planning.airportBeforeHours()));
            if (before.getCorridor() != null && before.getCorridor().isLocal()) {
                draftOf(before).ifPresent(plan -> retime(jobId, before, plan, reach, true, user));
            }
        }
        if (!toTerminal && at + 1 < journey.size() && request.scheduledArrivalAt() != null) {
            Trip after = journey.get(at + 1).getTrip();
            Instant collect = request.scheduledArrivalAt().plus(Duration.ofHours(planning.airportAfterHours()));
            if (after.getCorridor() != null && after.getCorridor().isRoad()) {
                draftOf(after).ifPresent(plan -> retime(jobId, after, plan, collect, false, user));
            }
        }
    }

    private Optional<RoutePlan> draftOf(Trip trip) {
        return routePlanRows.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT);
    }

    /**
     * Times {@code plan}'s stops again from its legs' minutes and its stops' stays: from {@code anchor} at its first
     * stop, or, with {@code toLast}, so that its last stop is reached at {@code anchor}. Untouched when a leg has no
     * minutes to time it by.
     */
    private void retime(UUID jobId, Trip trip, RoutePlan plan, Instant anchor, boolean toLast, User user) {
        List<RouteStop> stops = plan.getStops();
        List<Duration> offsets = new ArrayList<>();
        Duration t = Duration.ZERO;
        for (int s = 0; s < stops.size(); s++) {
            if (s > 0) {
                int seq = stops.get(s).getSeq();
                Optional<Integer> min = plan.getLegs().stream()
                        .filter(leg -> leg.getToStop().getSeq() == seq)
                        .map(RouteLeg::getPlannedMin)
                        .filter(Objects::nonNull)
                        .findFirst();
                if (min.isEmpty()) return;
                t = t.plusMinutes(min.get());
            }
            offsets.add(t);
            Short stay = stops.get(s).getPlannedStayMin();
            if (stay != null && s < stops.size() - 1) t = t.plusMinutes(stay);
        }
        Instant start = toLast ? anchor.minus(offsets.getLast()) : anchor;
        List<CreateRoutePlanRequest.StopItem> items = new ArrayList<>();
        for (int s = 0; s < stops.size(); s++) {
            RouteStop st = stops.get(s);
            items.add(CreateRoutePlanRequest.StopItem.builder()
                    .seq(st.getSeq())
                    .kind(st.getKind())
                    .jobId(st.getJob() == null ? null : st.getJob().getId())
                    .placeId(st.getPlace() == null ? null : st.getPlace().getId())
                    .borderCrossingId(
                            st.getBorderCrossing() == null
                                    ? null
                                    : st.getBorderCrossing().getId())
                    .plannedAt(start.plus(offsets.get(s)))
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
                        .build())
                .toList();
        routePlans.createOrUpdateDraft(
                jobId, trip.getId(), new CreateRoutePlanRequest(null, null, "Timed to the flight", items, legs), user);
    }

    /**
     * What the job page warns about its journey (US-F3-21): where it ends short of the destination city, where it
     * differs from the route the customer was quoted, since the price was worked out on that route, each scheduled
     * quarantine no trip takes the horses to yet, each one the trips plan too short a stay at, and each trip that brings
     * the horses after a quarantine starts or collects them before it ends (US-F3-22).
     */
    @Transactional(readOnly = true)
    public List<String> warnings(TransportJob job) {
        List<TripJob> journey = jobTrips.journey(job);
        List<String> out = new ArrayList<>(unreachedQuarantines(job, journey));
        for (QuarantinePeriod q : quarantineRules.heldFor(job)) {
            shortStay(job, journey, q).ifPresent(out::add);
            out.addAll(clashes(job, journey, q));
        }
        if (journey.isEmpty()) return out;
        String destination = destinationCity(job);
        Trip last = journey.getLast().getTrip();
        if (destination != null && !JobTripService.reachesDestination(last, job)) {
            out.add(
                    destination.equalsIgnoreCase(last.endCity())
                            ? "Lands at " + last.endCity() + "'s airport; the horses go to "
                                    + job.getRequest().getDestinationPlace().getName()
                                    + ". Add the local road trip from the cargo terminal."
                            : "Ends in " + last.endCity() + "; the horses go to " + destination + ". Add a trip from "
                                    + last.endCity() + ".");
        }
        List<Corridor> quoted = quoted(job.getRequest());
        List<Corridor> planned = journey.stream()
                .map(p -> p.getTrip().getCorridor())
                .filter(Objects::nonNull)
                .toList();
        // A local run to or from the cargo terminal is priced by the quote's transfer line, not as a corridor.
        List<String> notQuoted = planned.stream()
                .filter(c -> !c.isLocal())
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

    /**
     * "Quarantine at Phú Thọ, 20–27 Nov: no trip takes the horses there yet." for each station where the job has a
     * quarantine scheduled and no trip of its journey hands the horses on.
     */
    private List<String> unreachedQuarantines(TransportJob job, List<TripJob> journey) {
        List<QuarantinePeriod> held = quarantineRules.heldFor(job);
        if (held.isEmpty()) return List.of();
        List<UUID> reached = journey.stream()
                .map(part -> handoverOf(part.getTrip(), job))
                .flatMap(Optional::stream)
                .map(Place::getId)
                .toList();
        return stations(held).stream()
                .filter(s -> !reached.contains(s.placeId()))
                .map(s -> "Quarantine at " + s.placeName() + ", " + QuarantineRules.period(s.startsOn(), s.endsOn())
                        + ": no trip takes the horses there yet.")
                .toList();
    }

    /**
     * Each trip of {@code job}'s journey whose planned times clash with {@code quarantine} (US-F3-22): one that brings
     * the horses to the station after the quarantine's first day, or collects them there before its last day. Route
     * confirmation refuses both; a quarantine scheduled or changed after confirmation can still make them.
     */
    @Transactional(readOnly = true)
    public List<String> clashes(TransportJob job, QuarantinePeriod quarantine) {
        return clashes(job, jobTrips.journey(job), quarantine);
    }

    private List<String> clashes(TransportJob job, List<TripJob> journey, QuarantinePeriod q) {
        Place station = q.getPlace();
        List<String> out = new ArrayList<>();
        for (StationStop s : stopsAt(job, journey, station, RouteStopKind.TRANSFER)) {
            if (LocalDate.ofInstant(s.at(), BusinessTime.ZONE).isAfter(q.getStartsOn())) {
                out.add(s.trip().getCode() + " brings the horses to " + station.getName() + " at "
                        + QuarantineRules.at(s.at()) + ", after their quarantine there starts on "
                        + BusinessTime.SHORT_DAY.format(q.getStartsOn()) + ".");
            }
        }
        for (StationStop s : stopsAt(job, journey, station, RouteStopKind.PICKUP)) {
            if (LocalDate.ofInstant(s.at(), BusinessTime.ZONE).isBefore(q.getEndsOn())) {
                out.add(s.trip().getCode() + " collects the horses at " + station.getName() + " at "
                        + QuarantineRules.at(s.at()) + ", before their quarantine there ends on "
                        + BusinessTime.SHORT_DAY.format(q.getEndsOn()) + ".");
            }
        }
        return out;
    }

    /**
     * "Quarantine at Phú Thọ, 20–27 Nov: the trips plan 5 days there; Hong Kong import asks for at least 7." when the
     * trip into the station and the trip out of it are both planned, and the days between them are fewer than the
     * minimum {@link QuarantineRules#minimumDays} gives for the quarantine's kind.
     */
    private Optional<String> shortStay(TransportJob job, List<TripJob> journey, QuarantinePeriod q) {
        Place station = q.getPlace();
        Optional<Instant> in = stopsAt(job, journey, station, RouteStopKind.TRANSFER).stream()
                .map(StationStop::at)
                .min(Comparator.naturalOrder());
        Optional<Instant> out = stopsAt(job, journey, station, RouteStopKind.PICKUP).stream()
                .map(StationStop::at)
                .max(Comparator.naturalOrder());
        if (in.isEmpty() || out.isEmpty()) return Optional.empty();
        long days = ChronoUnit.DAYS.between(
                LocalDate.ofInstant(in.get(), BusinessTime.ZONE), LocalDate.ofInstant(out.get(), BusinessTime.ZONE));
        return clearance.destinationVersion(job.getId()).flatMap(destination -> {
            int minimum = quarantineRules.minimumDays(q.getKind(), destination);
            return days >= minimum
                    ? Optional.<String>empty()
                    : Optional.of("Quarantine at " + station.getName() + ", "
                            + QuarantineRules.period(q.getStartsOn(), q.getEndsOn()) + ": the trips plan " + days
                            + (days == 1 ? " day" : " days") + " there; "
                            + destination.getCatalog().getName()
                            + " asks for at least " + minimum + ".");
        });
    }

    /** A planned stop of {@code job}'s at a station, on one trip of its journey. */
    private record StationStop(Trip trip, Instant at) {}

    /** The planned stops of {@code kind} for {@code job} at {@code place}, on each trip's current route. */
    private List<StationStop> stopsAt(TransportJob job, List<TripJob> journey, Place place, RouteStopKind kind) {
        List<StationStop> out = new ArrayList<>();
        for (TripJob part : journey) {
            Trip trip = part.getTrip();
            currentRoute(trip)
                    .ifPresent(plan -> plan.getStops().stream()
                            .filter(st -> st.getKind() == kind
                                    && st.getPlannedAt() != null
                                    && st.getJob() != null
                                    && st.getJob().getId().equals(job.getId())
                                    && st.getPlace() != null
                                    && st.getPlace().getId().equals(place.getId()))
                            .forEach(st -> out.add(new StationStop(trip, st.getPlannedAt()))));
        }
        return out;
    }

    /** The trip's route as the coordinator is working on it: its draft, else its confirmed one. */
    private Optional<RoutePlan> currentRoute(Trip trip) {
        return routePlanRows
                .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT)
                .or(() -> routePlanRows.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED));
    }

    /**
     * The station of {@code quarantinePlaceId} for a trip on {@code corridor} to end at: refused unless the job has a
     * quarantine scheduled there, in the city the trip ends in, and the trip doesn't deliver.
     */
    private Place stationFor(TransportJob job, Corridor corridor, boolean reversed, UUID quarantinePlaceId) {
        Trip probe = probe(corridor, reversed);
        if (!corridor.isRoad()) {
            throw new BusinessException(
                    "QUARANTINE_NOT_ON_WAY",
                    corridor.getCode() + " flies; a flight hands the horses on at the airport, and a road trip takes"
                            + " them on to the quarantine station.");
        }
        if (JobTripService.reachesDestination(probe, job)) {
            throw new BusinessException(
                    "QUARANTINE_NOT_ON_WAY",
                    corridor.getCode() + " delivers " + job.getCode() + "'s horses in " + probe.endCity()
                            + "; only a trip that hands them on can end at a quarantine station.");
        }
        return quarantineRules.heldFor(job).stream()
                .map(QuarantinePeriod::getPlace)
                .filter(p -> p.getId().equals(quarantinePlaceId))
                .findFirst()
                .filter(p -> p.getCity() != null && p.getCity().equalsIgnoreCase(probe.endCity()))
                .orElseThrow(() -> new BusinessException(
                        "NO_QUARANTINE_THERE",
                        job.getCode() + " has no quarantine scheduled at that station in " + probe.endCity()
                                + ". Schedule it on the Authorities tab first."));
    }

    /** The stations of {@code held} in {@code city}, but {@code except}, where the trip starts. */
    private static List<QuarantineStation> stationsIn(List<QuarantinePeriod> held, String city, Place except) {
        return stations(held.stream()
                .filter(q -> city.equalsIgnoreCase(q.getPlace().getCity()))
                .filter(q -> except == null || !q.getPlace().getId().equals(except.getId()))
                .toList());
    }

    /** One entry per station of {@code held}, from its earliest first day to its latest last day. */
    private static List<QuarantineStation> stations(List<QuarantinePeriod> held) {
        Map<UUID, QuarantineStation> out = new LinkedHashMap<>();
        for (QuarantinePeriod q : held) {
            Place p = q.getPlace();
            out.merge(
                    p.getId(),
                    new QuarantineStation(p.getId(), p.getName(), q.getStartsOn(), q.getEndsOn()),
                    (a, b) -> new QuarantineStation(
                            a.placeId(),
                            a.placeName(),
                            a.startsOn().isBefore(b.startsOn()) ? a.startsOn() : b.startsOn(),
                            a.endsOn().isAfter(b.endsOn()) ? a.endsOn() : b.endsOn()));
        }
        return List.copyOf(out.values());
    }

    /** An unsaved trip on {@code corridor}, to ask where it would end before it is made. */
    private static Trip probe(Corridor corridor, boolean reversed) {
        Trip probe = new Trip();
        probe.setCorridor(corridor);
        probe.setReversed(reversed);
        return probe;
    }

    /** The local road run within {@code city}, between its stables and its cargo terminal, if the catalog has one. */
    @Transactional(readOnly = true)
    public Optional<Corridor> localRun(String city) {
        return corridors.findLocalRun(city);
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
        return currentRoute(trip)
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
     * stop, and never {@code except}, where the trip starts. The coordinator can move a road trip's stop on its route.
     */
    private Place handoverPlace(String city, TransportRequest request, Place except) {
        if (city == null) return null;
        List<Place> inCity = places.findByCityIgnoreCase(city).stream()
                .filter(p -> p.getKind() != PlaceKind.WELFARE_STOP)
                .filter(p -> except == null || !p.getId().equals(except.getId()))
                .toList();
        for (PlaceKind kind : List.of(PlaceKind.CARGO_TERMINAL, PlaceKind.AIRPORT, PlaceKind.QUARANTINE)) {
            Optional<Place> found =
                    inCity.stream().filter(p -> p.getKind() == kind).min(Comparator.comparing(Place::getName));
            if (found.isPresent()) return found.get();
        }
        for (Place own : new Place[] {request.getOriginPlace(), request.getDestinationPlace()}) {
            if (own != null
                    && (except == null || !own.getId().equals(except.getId()))
                    && city.equalsIgnoreCase(own.getCity())) return own;
        }
        return inCity.stream().min(Comparator.comparing(Place::getName)).orElse(null);
    }

    private TransportJob job(UUID jobId) {
        return jobs.findById(jobId).orElseThrow(() -> ResourceNotFoundException.of("Job", jobId));
    }
}
