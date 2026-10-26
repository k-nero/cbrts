package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.VehicleBooking;
import com.equifreight.entity.enums.BookingKind;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.VehicleStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.VehicleBookingRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.PriorityQueue;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Whether a vehicle may run a road trip (US-F7-01, US-F7-02; docs/vehicle-permits-availability-plan.md). In this
 * order: it is active, the trip's corridor is one of its operating corridors, it isn't expected back after the trip
 * starts, it can be in the country the trip starts in by then, and no other booking overlaps the trip.
 *
 * <p>Where a vehicle can be comes from its own bookings: its last trip or hold ending by the start leaves it in that
 * trip's destination country; after the turnaround (the rate catalog's {@code TURNAROUND_HOURS}) it is ready there,
 * and it can drive empty to another country along a corridor it works, in that corridor's driving days. With no
 * booking it is ready in its home country. The empty drive isn't booked, so a return load can still take its place.
 *
 * <p>An air trip carries no vehicle, so only the status is checked there. Every point where a vehicle joins a trip,
 * the hold at acceptance and the fleet check at review ask here, so each refuses with the same sentence.
 */
@Service
public class VehicleAvailability {

    /** The turnaround when the published rate catalog doesn't set one. */
    static final Duration DEFAULT_TURNAROUND = Duration.ofHours(24);

    private static final DateTimeFormatter DAY = BusinessTime.SHORT_DAY.withZone(BusinessTime.ZONE);
    private static final DateTimeFormatter DAY_TIME =
            DateTimeFormatter.ofPattern("d MMM HH:mm", Locale.ENGLISH).withZone(BusinessTime.ZONE);

    private final JobTripService jobTrips;
    private final VehicleBookingRepository bookings;
    private final RateCatalogVersionRepository versions;
    private final RatePolicyRepository policies;
    private final CorridorRepository corridors;
    private final Clock clock;

    public VehicleAvailability(
            JobTripService jobTrips,
            VehicleBookingRepository bookings,
            RateCatalogVersionRepository versions,
            RatePolicyRepository policies,
            CorridorRepository corridors,
            Clock clock) {
        this.jobTrips = jobTrips;
        this.bookings = bookings;
        this.versions = versions;
        this.policies = policies;
        this.corridors = corridors;
        this.clock = clock;
    }

    /**
     * When the trip runs: from its planned departure (or its jobs' earliest, or their requests' earliest departure
     * date) to its jobs' latest planned arrival, or the start plus its corridor's driving days while the route isn't
     * planned. The start is null while no date is known.
     */
    public record Span(Instant startsAt, Instant endsAt) {}

    /** Bookings that are this trip's or request's own, so they don't make the vehicle busy for it. */
    public record Own(Set<UUID> tripIds, Set<UUID> requestIds) {
        boolean contains(VehicleBooking b) {
            return (b.getTrip() != null && tripIds.contains(b.getTrip().getId()))
                    || (b.getRequest() != null
                            && requestIds.contains(b.getRequest().getId()));
        }
    }

    @Transactional(readOnly = true)
    public Span spanOf(Trip trip) {
        List<TransportJob> jobs = jobTrips.jobsOn(trip);
        Instant startsAt = trip.getPlannedDepartureAt();
        if (startsAt == null) {
            startsAt = jobs.stream()
                    .map(TransportJob::getPlannedDepartureAt)
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .orElse(null);
        }
        if (startsAt == null) {
            startsAt = jobs.stream()
                    .map(j -> j.getRequest() == null ? null : j.getRequest().getDepartureDate())
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .map(VehicleAvailability::startOf)
                    .orElse(null);
        }
        Instant endsAt = jobs.isEmpty() || jobs.stream().anyMatch(j -> j.getPlannedArrivalAt() == null)
                ? null
                : jobs.stream()
                        .map(TransportJob::getPlannedArrivalAt)
                        .max(Comparator.naturalOrder())
                        .orElse(null);
        if (endsAt == null && startsAt != null) {
            endsAt = afterDriving(startsAt, trip.getCorridor());
        }
        return new Span(startsAt, endsAt);
    }

    /** The start of {@code day} in the business time zone. */
    public static Instant startOf(LocalDate day) {
        return day.atStartOfDay(BusinessTime.ZONE).toInstant();
    }

    /** {@code start} plus the corridor's driving days: how long a trip on it lasts before its route is planned. */
    public static Instant afterDriving(Instant start, Corridor corridor) {
        int days = corridor == null ? 1 : Math.max(1, corridor.getDrivingDays());
        return start.plus(days, ChronoUnit.DAYS);
    }

    /** The turnaround after a trip, from the published rate catalog; 24 hours when it isn't set. */
    @Transactional(readOnly = true)
    public Duration turnaround() {
        return versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED)
                .flatMap(v -> policies.findByVersionIdAndKey(v.getId(), RatePolicyKey.TURNAROUND_HOURS))
                .map(p -> Duration.ofMinutes(
                        p.getValue().multiply(BigDecimal.valueOf(60)).longValue()))
                .orElse(DEFAULT_TURNAROUND);
    }

    /** The trip's own bookings, and the holds of the requests whose jobs ride it. */
    @Transactional(readOnly = true)
    public Own ownOf(Trip trip) {
        Set<UUID> requestIds = jobTrips.jobsOn(trip).stream()
                .map(TransportJob::getRequest)
                .filter(Objects::nonNull)
                .map(TransportRequest::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return new Own(trip.getId() == null ? Set.of() : Set.of(trip.getId()), requestIds);
    }

    /**
     * What every check needs besides the vehicle's bookings: the turnaround, the road network an empty drive can use,
     * and now (a vehicle with no trip yet can set off from its home city from now on).
     */
    record Context(Duration turnaround, RoadNetwork roads, Instant now) {}

    @Transactional(readOnly = true)
    Context context() {
        return new Context(turnaround(), new RoadNetwork(corridors.findRoadNetwork()), clock.instant());
    }

    /** Why {@code vehicle} can't join {@code trip}, or empty when it can. */
    @Transactional(readOnly = true)
    public Optional<String> refusalFor(Vehicle vehicle, Trip trip) {
        Span span = spanOf(trip);
        return refusal(
                vehicle,
                trip.getCorridor(),
                span.startsAt(),
                span.endsAt(),
                ownOf(trip),
                context(),
                bookings.findForAvailability(vehicle.getId()));
    }

    /**
     * Why {@code vehicle} can't run {@code request}'s trip starting on {@code day}, or empty when it can; the
     * request's own hold doesn't count. For the hold at acceptance and the fleet check at review (US-F7-02).
     */
    @Transactional(readOnly = true)
    public Optional<String> refusalFor(Vehicle vehicle, TransportRequest request, LocalDate day) {
        Instant start = startOf(day);
        return refusal(
                vehicle,
                request.getCorridor(),
                start,
                afterDriving(start, request.getCorridor()),
                ownOf(request),
                context(),
                bookings.findForAvailability(vehicle.getId()));
    }

    /**
     * The first day from {@code from} to {@code last} on which {@code vehicle} can start {@code request}'s trip, or
     * empty when it can't on any of them.
     */
    @Transactional(readOnly = true)
    public Optional<LocalDate> earliestStart(
            Vehicle vehicle, TransportRequest request, LocalDate from, LocalDate last) {
        Own own = ownOf(request);
        Context context = context();
        List<VehicleBooking> held = bookings.findForAvailability(vehicle.getId());
        for (LocalDate day = from; !day.isAfter(last); day = day.plusDays(1)) {
            Instant start = startOf(day);
            Instant end = afterDriving(start, request.getCorridor());
            if (refusal(vehicle, request.getCorridor(), start, end, own, context, held)
                    .isEmpty()) {
                return Optional.of(day);
            }
        }
        return Optional.empty();
    }

    private static Own ownOf(TransportRequest request) {
        return new Own(Set.of(), request.getId() == null ? Set.of() : Set.of(request.getId()));
    }

    /**
     * The rules, on the vehicle's bookings already loaded. {@code start} null means the date isn't known yet: then
     * only the status and the corridor are checked.
     */
    static Optional<String> refusal(
            Vehicle vehicle,
            Corridor corridor,
            Instant start,
            Instant end,
            Own own,
            Context context,
            List<VehicleBooking> held) {
        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            return Optional.of(
                    vehicle.getCode() + " is " + statusWords(vehicle.getStatus()) + " and can't run a trip.");
        }
        if (corridor == null || !corridor.isRoad()) return Optional.empty();
        if (!vehicle.runs(corridor)) {
            return Optional.of(vehicle.getCode() + " doesn't run " + corridor.getCode() + ".");
        }
        if (start == null) return Optional.empty();
        String starts = "this trip starts " + DAY.format(start) + ".";

        LocalDate startDay = start.atZone(BusinessTime.ZONE).toLocalDate();
        if (vehicle.getAvailableOn() != null && vehicle.getAvailableOn().isAfter(startDay)) {
            return Optional.of(vehicle.getCode() + " is expected back on "
                    + BusinessTime.SHORT_DAY.format(vehicle.getAvailableOn()) + "; " + starts);
        }

        Optional<String> location =
                locationRefusal(vehicle, corridor.getOriginCity(), start, starts, own, context, held);
        if (location.isPresent()) return location;

        if (end != null && start.isBefore(end)) {
            Optional<Instant> busyUntil = held.stream()
                    .filter(b -> !own.contains(b))
                    .filter(b -> b.getStartsAt().isBefore(end) && b.getEndsAt().isAfter(start))
                    .map(VehicleBooking::getEndsAt)
                    .max(Comparator.naturalOrder());
            if (busyUntil.isPresent()) {
                return Optional.of(vehicle.getCode() + " is booked until " + DAY_TIME.format(busyUntil.get()) + ".");
            }
        }
        return Optional.empty();
    }

    /**
     * Whether the vehicle can be in {@code startCity} by {@code start} (US-F7-03): ready in the city its last trip or
     * hold left it once the turnaround is over (in its home city from now, with no trip yet), then, when that is
     * another city, after the quickest permitted empty drive there.
     */
    private static Optional<String> locationRefusal(
            Vehicle vehicle,
            String startCity,
            Instant start,
            String starts,
            Own own,
            Context context,
            List<VehicleBooking> held) {
        Optional<VehicleBooking> last = held.stream()
                .filter(b -> !own.contains(b))
                .filter(b -> corridorOf(b) != null && !b.getEndsAt().isAfter(start))
                .max(Comparator.comparing(VehicleBooking::getEndsAt));
        String where = last.map(b -> corridorOf(b).getDestinationCity()).orElse(vehicle.getHomeCity());
        if (where == null || startCity == null) return Optional.empty();
        Instant ready = last.map(b -> b.getEndsAt().plus(context.turnaround())).orElse(null);

        if (RoadNetwork.sameCity(where, startCity)) {
            if (ready != null && ready.isAfter(start)) {
                return Optional.of(vehicle.getCode() + " is ready in " + where + " on " + DAY.format(ready)
                        + " after its last trip; " + starts);
            }
            return Optional.empty();
        }
        Optional<Integer> days = context.roads().drivingDays(where, startCity, vehicle);
        if (days.isEmpty()) {
            return Optional.of(vehicle.getCode()
                    + last.map(b -> " will be in " + where + " from " + DAY.format(b.getEndsAt()))
                            .orElse(" is based in " + where)
                    + " and has no permitted road to " + startCity + ".");
        }
        Instant from = ready != null ? ready : context.now();
        Instant there = from.plus(days.get(), ChronoUnit.DAYS);
        if (there.isAfter(start)) {
            return Optional.of(vehicle.getCode() + " can be in " + startCity + " on " + DAY.format(there)
                    + " (driving from " + where + ", " + days.get() + (days.get() == 1 ? " day" : " days") + "); "
                    + starts);
        }
        return Optional.empty();
    }

    private static Corridor corridorOf(VehicleBooking b) {
        if (b.getKind() == BookingKind.JOB && b.getTrip() != null)
            return b.getTrip().getCorridor();
        if (b.getKind() == BookingKind.RESERVED && b.getRequest() != null)
            return b.getRequest().getCorridor();
        return null;
    }

    /**
     * The road corridors an empty drive can use (US-F7-03): each in either direction, for its driving days, and only
     * through countries the vehicle holds a permit for (or is based in). The quickest chain is found by Dijkstra over
     * the cities; the catalog has a few dozen corridors, so this runs in memory.
     */
    static final class RoadNetwork {
        private final List<Corridor> roads;

        RoadNetwork(List<Corridor> roads) {
            this.roads = roads.stream().filter(Corridor::isRoad).toList();
        }

        static boolean sameCity(String a, String b) {
            return key(a).equals(key(b));
        }

        private static String key(String city) {
            return city == null ? "" : city.trim().toLowerCase(Locale.ROOT);
        }

        /** The fewest driving days from {@code from} to {@code to} for {@code vehicle}, or empty with no road. */
        Optional<Integer> drivingDays(String from, String to, Vehicle vehicle) {
            Map<String, Integer> best = new HashMap<>();
            PriorityQueue<Map.Entry<String, Integer>> queue = new PriorityQueue<>(Map.Entry.comparingByValue());
            best.put(key(from), 0);
            queue.add(Map.entry(key(from), 0));
            List<Corridor> usable = roads.stream()
                    .filter(c -> vehicle.refusalToRun(c).isEmpty())
                    .toList();
            while (!queue.isEmpty()) {
                Map.Entry<String, Integer> at = queue.poll();
                if (at.getValue() > best.getOrDefault(at.getKey(), Integer.MAX_VALUE)) continue;
                if (at.getKey().equals(key(to))) return Optional.of(at.getValue());
                for (Corridor c : usable) {
                    String next = null;
                    if (key(c.getOriginCity()).equals(at.getKey())) next = key(c.getDestinationCity());
                    else if (key(c.getDestinationCity()).equals(at.getKey())) next = key(c.getOriginCity());
                    if (next == null) continue;
                    int days = at.getValue() + Math.max(1, c.getDrivingDays());
                    if (days < best.getOrDefault(next, Integer.MAX_VALUE)) {
                        best.put(next, days);
                        queue.add(Map.entry(next, days));
                    }
                }
            }
            return Optional.empty();
        }
    }

    /** Refuses {@code vehicle} for {@code trip} with the reason, as every planning entry point does. */
    @Transactional(readOnly = true)
    public void require(Vehicle vehicle, Trip trip) {
        refusalFor(vehicle, trip).ifPresent(reason -> {
            throw new BusinessException("VEHICLE_UNAVAILABLE", reason);
        });
    }

    /**
     * The vehicle {@code trip} should start on: the one held for one of its requests when it may still run it, else
     * the first of {@code candidates} that may; refused, naming the corridor, when none may. On an air trip the first
     * active one.
     */
    @Transactional(readOnly = true)
    public Vehicle firstAvailable(List<Vehicle> candidates, Trip trip) {
        Set<UUID> heldIds = heldVehicleIds(trip);
        Optional<Vehicle> found = candidates.stream()
                .sorted(Comparator.comparing((Vehicle v) -> !heldIds.contains(v.getId())))
                .filter(v -> refusalFor(v, trip).isEmpty())
                .findFirst();
        if (found.isPresent()) return found.get();
        Corridor corridor = trip.getCorridor();
        if (corridor == null || !corridor.isRoad()) {
            throw new BusinessException("VEHICLE_UNAVAILABLE", "No active vehicle is available for this trip.");
        }
        if (candidates.stream().noneMatch(v -> v.runs(corridor))) {
            throw new BusinessException(
                    "VEHICLE_UNAVAILABLE",
                    "No vehicle runs " + corridor.getCode() + " yet. Assign one on the Vehicles page.");
        }
        Span span = spanOf(trip);
        String on = span.startsAt() == null ? "" : " on " + DAY.format(span.startsAt());
        String in = corridor.getOriginCity() == null ? "" : " and in " + corridor.getOriginCity();
        throw new BusinessException(
                "VEHICLE_UNAVAILABLE", "No vehicle that runs " + corridor.getCode() + " is free" + in + on + ".");
    }

    /** The vehicles held for the requests whose jobs ride {@code trip}. */
    @Transactional(readOnly = true)
    public Set<UUID> heldVehicleIds(Trip trip) {
        Set<UUID> requestIds = ownOf(trip).requestIds();
        if (requestIds.isEmpty()) return Set.of();
        return bookings.findByRequest_IdIn(requestIds).stream()
                .map(b -> b.getVehicle().getId())
                .collect(Collectors.toSet());
    }

    private static String statusWords(VehicleStatus status) {
        return switch (status) {
            case MAINTENANCE -> "in maintenance";
            case RETIRED -> "retired";
            case ACTIVE -> "active";
        };
    }
}
