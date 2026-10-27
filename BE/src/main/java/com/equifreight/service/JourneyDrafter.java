package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.CreateRoutePlanRequest;
import com.equifreight.model.trip.TripPartResponse;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.RouteStopRepository;
import com.equifreight.repository.TransportJobRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Drafts a job's journey from its quoted route for the coordinator to review (US-F3-22): a trip per corridor of the
 * quote, added with Add trip's rules (US-F3-21), and each road route drafted with its border crossings and welfare
 * stops, timed from the departure date with the rate catalog's planning settings. A flight from or to a stable gets a
 * local road run to or from the cargo terminal. A flight gets its times from "Set flight", so a road trip after it is
 * left untimed until then. Nothing is confirmed.
 */
@Log4j2
@Service
public class JourneyDrafter {

    private final TransportJobRepository jobs;
    private final PlaceRepository places;
    private final RoutePlanRepository routePlanRows;
    private final RouteStopRepository routeStops;
    private final JobTripService jobTrips;
    private final JourneyService journeys;
    private final RoutePlanService routePlans;
    private final PlanningDefaults defaults;
    private final AuditService audit;

    public JourneyDrafter(
            TransportJobRepository jobs,
            PlaceRepository places,
            RoutePlanRepository routePlanRows,
            RouteStopRepository routeStops,
            JobTripService jobTrips,
            JourneyService journeys,
            RoutePlanService routePlans,
            PlanningDefaults defaults,
            AuditService audit) {
        this.jobs = jobs;
        this.places = places;
        this.routePlanRows = routePlanRows;
        this.routeStops = routeStops;
        this.jobTrips = jobTrips;
        this.journeys = journeys;
        this.routePlans = routePlans;
        this.defaults = defaults;
        this.audit = audit;
    }

    /** A stop of a drafted road route: a place, or a border crossing for a BORDER stop. */
    public record DraftStop(
            RouteStopKind kind, Place place, BorderCrossing crossing, Instant plannedAt, Short stayMin) {}

    /** A drafted road route: its stops, the distance and minutes of each leg, and what the coordinator should know. */
    public record DraftRoute(List<DraftStop> stops, Integer legKm, Integer legMin, List<String> notes) {

        /** When the horses are ready to leave its last stop: its time plus its stay; null while untimed. */
        Instant readyAt() {
            DraftStop last = stops.getLast();
            if (last.plannedAt() == null) return null;
            return last.stayMin() == null
                    ? last.plannedAt()
                    : last.plannedAt().plus(Duration.ofMinutes(last.stayMin()));
        }
    }

    /**
     * Drafts {@code jobId}'s journey from its quoted route. Refused once the job has a trip: the coordinator takes its
     * trips off first, or builds on them by hand.
     */
    @Transactional
    public List<TripPartResponse> draft(UUID jobId, User user) {
        TransportJob job = jobs.findById(jobId).orElseThrow(() -> ResourceNotFoundException.of("Job", jobId));
        if (!jobTrips.journey(job).isEmpty()) {
            throw new BusinessException(
                    "JOURNEY_STARTED",
                    job.getCode()
                            + " already has trips. Take them off to draft the journey from the quote, or add trips by hand.");
        }
        TransportRequest request = job.getRequest();
        List<Corridor> quoted = legs(request);
        if (quoted.isEmpty()) {
            throw new BusinessException("NO_QUOTED_ROUTE", job.getCode() + "'s request has no route to draft from.");
        }
        PlanningDefaults.Planning planning = defaults.current();
        List<Place> welfare = places.findByKind(PlaceKind.WELFARE_STOP);
        Instant start = request.getDepartureDate() == null
                ? null
                : request.getDepartureDate()
                        .atTime(planning.startHour(), 0)
                        .atZone(BusinessTime.ZONE)
                        .toInstant();
        List<TripPartResponse> parts = List.of();
        for (int i = 0; i < quoted.size(); i++) {
            Corridor corridor = quoted.get(i);
            parts = journeys.addTrip(jobId, corridor.getId(), user);
            TripJob part = jobTrips.journey(job).getLast();
            Trip trip = part.getTrip();
            if (!corridor.isRoad()) {
                // The flight's times come from the airline; what follows it waits for them. Where it hands the horses
                // on, they wait for release by the airline and customs before the next trip collects them.
                routePlanRows
                        .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED)
                        .map(plan -> plan.getStops().getLast())
                        .filter(st -> st.getKind() == RouteStopKind.TRANSFER)
                        .ifPresent(st -> {
                            st.setPlannedStayMin((short) (planning.airportAfterHours() * 60));
                            routeStops.save(st);
                        });
                start = null;
                continue;
            }
            RoutePlan draft = routePlanRows
                    .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT)
                    .orElseThrow(() -> new BusinessException("Trip " + trip.getCode() + " has no draft route"));
            RouteStop first = draft.getStops().getFirst();
            RouteStop end = draft.getStops().getLast();
            boolean flightNext = i + 1 < quoted.size() && !quoted.get(i + 1).isRoad();
            DraftRoute route =
                    road(trip, first.getPlace(), end.getKind(), end.getPlace(), start, flightNext, planning, welfare);
            routePlans.createOrUpdateDraft(jobId, trip.getId(), request(job, route), user);
            start = route.readyAt();
        }

        audit.recordDecision(
                user,
                "DRAFT_JOURNEY",
                AuditText.fit(job.getCode() + "'s journey drafted from the quote: "
                        + String.join(
                                ", ", quoted.stream().map(Corridor::getCode).toList())),
                "TRANSPORT_JOB",
                job.getId(),
                job.getCode(),
                null,
                null,
                null);
        log.info("{} journey drafted from the quote", job.getCode());
        return parts;
    }

    /**
     * The trips to draft for {@code request}: the corridors it was quoted, the leg to the hub, the corridor and the leg
     * from it, with a local road run before a flight that leaves from a stable rather than the airport, and after one
     * that lands in the city of a stable, so a vehicle takes the horses to and from the cargo terminal.
     */
    List<Corridor> legs(TransportRequest request) {
        List<Corridor> out = new ArrayList<>();
        if (request.getFirstLegCorridor() != null) out.add(request.getFirstLegCorridor());
        if (request.getCorridor() != null) out.add(request.getCorridor());
        if (request.getLastLegCorridor() != null) out.add(request.getLastLegCorridor());
        if (out.isEmpty()) return out;
        Place origin = request.getOriginPlace();
        if (!out.getFirst().isRoad() && origin != null && !origin.isTerminal()) {
            journeys.localRun(origin.getCity()).ifPresent(out::addFirst);
        }
        Place destination = request.getDestinationPlace();
        Corridor last = out.getLast();
        if (!last.isRoad()
                && destination != null
                && !destination.isTerminal()
                && destination.getCity() != null
                && (destination.getCity().equalsIgnoreCase(last.getDestinationCity())
                        || destination.getCity().equalsIgnoreCase(last.getOriginCity()))) {
            journeys.localRun(destination.getCity()).ifPresent(out::add);
        }
        return out;
    }

    /**
     * A road trip's drafted route (US-F3-22): the pickup at {@code from}, then, country by country in the trip's
     * direction, the welfare stops in that country and the border crossing out of it, then the {@code endKind} at
     * {@code to}. Welfare stops are the catalog's welfare places in the countries passed through, one per
     * {@code welfareEveryHours} of driving. The driving time, the corridor's distance at the planned speed, is shared
     * equally between the legs; border and welfare stops add their stays, and a transfer before a flight its wait at
     * the cargo terminal. Untimed when {@code start} is null.
     */
    public static DraftRoute road(
            Trip trip,
            Place from,
            RouteStopKind endKind,
            Place to,
            Instant start,
            boolean flightNext,
            PlanningDefaults.Planning planning,
            List<Place> welfarePlaces) {
        Corridor corridor = trip.getCorridor();
        List<Country> countries = new ArrayList<>(corridor.countries());
        List<CorridorCrossing> crossings = new ArrayList<>(corridor.getCrossings());
        crossings.sort(Comparator.comparingInt(CorridorCrossing::getSeq));
        if (trip.isReversed()) {
            Collections.reverse(countries);
            Collections.reverse(crossings);
        }
        Integer distance = corridor.getDistanceKm();
        Integer driveMin = distance == null ? null : (int) Math.round(distance * 60.0 / planning.speedKmh());
        int needed = driveMin == null ? 0 : Math.max(0, (driveMin - 1) / (planning.welfareEveryHours() * 60));

        Set<String> ends = new HashSet<>();
        for (Place p : new Place[] {from, to})
            if (p != null && p.getCity() != null) ends.add(p.getCity().toLowerCase());
        List<List<Place>> welfareByCountry = new ArrayList<>();
        int found = 0;
        for (Country country : countries) {
            List<Place> here = welfarePlaces.stream()
                    .filter(p -> p.getCountry() != null && sameCountry(p.getCountry(), country))
                    .filter(p ->
                            p.getCity() == null || !ends.contains(p.getCity().toLowerCase()))
                    .sorted(Comparator.comparing(Place::getName))
                    .toList();
            List<Place> taken = here.subList(0, Math.min(here.size(), Math.max(0, needed - found)));
            found += taken.size();
            welfareByCountry.add(taken);
        }

        List<DraftStop> stops = new ArrayList<>();
        stops.add(new DraftStop(RouteStopKind.PICKUP, from, null, null, null));
        for (int c = 0; c < countries.size(); c++) {
            for (Place w : welfareByCountry.get(c)) {
                stops.add(new DraftStop(RouteStopKind.WELFARE, w, null, null, (short) planning.welfareStopMin()));
            }
            if (c < crossings.size()) {
                stops.add(new DraftStop(
                        RouteStopKind.BORDER, null, crossings.get(c).getBorderCrossing(), null, (short)
                                planning.borderStopMin()));
            }
        }
        for (int c = countries.size(); c < crossings.size(); c++) {
            stops.add(new DraftStop(RouteStopKind.BORDER, null, crossings.get(c).getBorderCrossing(), null, (short)
                    planning.borderStopMin()));
        }
        // Before a flight the horses wait at the cargo terminal for export checks and loading.
        Short endStay =
                endKind == RouteStopKind.TRANSFER && flightNext ? (short) (planning.airportBeforeHours() * 60) : null;
        stops.add(new DraftStop(endKind, to, null, null, endStay));

        int legs = stops.size() - 1;
        Integer legMin = driveMin == null ? null : Math.round((float) driveMin / legs);
        Integer legKm = distance == null ? null : Math.round((float) distance / legs);
        List<DraftStop> timed = new ArrayList<>();
        Instant t = start;
        for (int s = 0; s < stops.size(); s++) {
            DraftStop st = stops.get(s);
            if (t != null && s > 0 && legMin != null) t = t.plus(Duration.ofMinutes(legMin));
            Instant at = t == null || (s > 0 && legMin == null) ? null : t;
            timed.add(new DraftStop(st.kind(), st.place(), st.crossing(), at, st.stayMin()));
            if (t != null && st.stayMin() != null && s < stops.size() - 1) t = t.plus(Duration.ofMinutes(st.stayMin()));
        }

        List<String> notes = new ArrayList<>();
        if (found < needed) {
            notes.add("The drive takes about " + Math.round(driveMin / 60.0) + " h, so it needs " + needed
                    + " welfare " + (needed == 1 ? "stop" : "stops") + "; the catalog has " + found + " in "
                    + String.join(", ", countries.stream().map(Country::getName).toList())
                    + ". Add one if the drive needs a rest.");
        }
        if (distance == null)
            notes.add(corridor.getCode() + " has no distance, so its times are left for you to plan.");
        if (start == null) notes.add("Plan the times once the trip before is timed.");
        return new DraftRoute(timed, legKm, legMin, notes);
    }

    /** The draft {@code route} as a route plan request for {@code job}. */
    private static CreateRoutePlanRequest request(TransportJob job, DraftRoute route) {
        List<CreateRoutePlanRequest.StopItem> stops = new ArrayList<>();
        List<CreateRoutePlanRequest.LegItem> legs = new ArrayList<>();
        for (int i = 0; i < route.stops().size(); i++) {
            DraftStop st = route.stops().get(i);
            boolean owned = st.kind() == RouteStopKind.PICKUP
                    || st.kind() == RouteStopKind.DELIVERY
                    || st.kind() == RouteStopKind.TRANSFER;
            stops.add(CreateRoutePlanRequest.StopItem.builder()
                    .seq((short) (i + 1))
                    .kind(st.kind())
                    .jobId(owned ? job.getId() : null)
                    .placeId(st.place() == null ? null : st.place().getId())
                    .borderCrossingId(
                            st.crossing() == null ? null : st.crossing().getId())
                    .plannedAt(st.plannedAt())
                    .plannedStayMin(st.stayMin())
                    .build());
            if (i > 0) {
                legs.add(CreateRoutePlanRequest.LegItem.builder()
                        .seq((short) i)
                        .fromStopSeq((short) i)
                        .toStopSeq((short) (i + 1))
                        .mode(TransportMode.ROAD)
                        .distanceKm(route.legKm())
                        .plannedMin(route.legMin())
                        .build());
            }
        }
        String reason =
                "Drafted from the quote" + (route.notes().isEmpty() ? "." : ". " + String.join(" ", route.notes()));
        return new CreateRoutePlanRequest(null, null, reason, stops, legs);
    }

    private static boolean sameCountry(Country a, Country b) {
        if (a.getId() != null && b.getId() != null) return a.getId().equals(b.getId());
        return Objects.equals(a.getCode(), b.getCode());
    }
}
