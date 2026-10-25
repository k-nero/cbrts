package com.equifreight.service;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.Flight;
import com.equifreight.entity.FlightAllocation;
import com.equifreight.entity.Place;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.RouteLeg;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.CrewRole;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.UpdateFlightAllocationRequest;
import com.equifreight.repository.FlightAllocationRepository;
import com.equifreight.repository.FlightRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.TransportJobRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Shared flights (US-F3-15, docs/shared-trips-design.md): a trip's air leg has one flight, and every job on the trip
 * flies on it with its own allocation (air waybill, stall positions, service class). A job joins a trip that flies
 * only from the same airports and with room in the stall positions the airline gives the trip; the flight crew is
 * counted for every horse on board.
 */
@Service
public class FlightService {

    private final FlightRepository flights;
    private final FlightAllocationRepository allocationRows;
    private final RoutePlanRepository routePlans;
    private final TransportJobRepository jobs;
    private final JobTripService jobTrips;
    private final RateCatalogVersionRepository catalogVersions;
    private final RatePolicyRepository policies;
    private final AuditService audit;

    public FlightService(
            FlightRepository flights,
            FlightAllocationRepository allocationRows,
            RoutePlanRepository routePlans,
            TransportJobRepository jobs,
            JobTripService jobTrips,
            RateCatalogVersionRepository catalogVersions,
            RatePolicyRepository policies,
            AuditService audit) {
        this.flights = flights;
        this.allocationRows = allocationRows;
        this.routePlans = routePlans;
        this.jobs = jobs;
        this.jobTrips = jobTrips;
        this.catalogVersions = catalogVersions;
        this.policies = policies;
        this.audit = audit;
    }

    /** The flights of a route version, in leg order. */
    public List<Flight> flightsOf(RoutePlan plan) {
        List<Flight> found = new ArrayList<>();
        plan.getLegs().stream()
                .filter(leg -> leg.getMode() == TransportMode.AIR)
                .sorted((a, b) -> Short.compare(a.getSeq(), b.getSeq()))
                .forEach(leg -> flights.findByRouteLegId(leg.getId()).ifPresent(found::add));
        return found;
    }

    /** The route the trip is being planned on: its draft, else its confirmed version. */
    public Optional<RoutePlan> currentRoute(Trip trip) {
        return routePlans
                .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT)
                .or(() -> routePlans.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED));
    }

    /**
     * The stall positions a job takes on a flight: what its quotation priced (96 in positions), else one per horse.
     */
    public static short positionsFor(TransportJob job) {
        if (job.getQuotation() != null) {
            BigDecimal quoted = job.getQuotation().getLines().stream()
                    .filter(l -> l.getBasis() == RateBasis.PER_POSITION && l.getQuantity() != null)
                    .map(QuotationLine::getQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (quoted.signum() > 0)
                return (short) quoted.setScale(0, RoundingMode.CEILING).intValue();
        }
        return (short) Math.max(1, job.getRequest().getHorses().size());
    }

    /** A new consignment for {@code job} on {@code flight}: its quoted positions and its class, no waybill yet. */
    public static FlightAllocation allocationFor(Flight flight, TransportJob job) {
        FlightAllocation a = new FlightAllocation();
        a.setFlight(flight);
        a.setJob(job);
        a.setStallPositions(positionsFor(job));
        a.setServiceClass(job.getRequest().getAirClass());
        return a;
    }

    /** A copy of {@code from}'s consignments onto {@code to}, for a new route version. */
    public static void copyAllocations(Flight from, Flight to) {
        for (FlightAllocation a : from.getAllocations()) {
            FlightAllocation copy = new FlightAllocation();
            copy.setFlight(to);
            copy.setJob(a.getJob());
            copy.setAirWaybill(a.getAirWaybill());
            copy.setStallPositions(a.getStallPositions());
            copy.setServiceClass(a.getServiceClass());
            to.getAllocations().add(copy);
        }
    }

    /**
     * Gives every job on the trip a consignment on each flight of its draft route that lacks one (a job that just
     * joined, or a flight just planned), and takes off the consignments of jobs no longer on it.
     */
    @Transactional
    public void allocate(Trip trip) {
        routePlans
                .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT)
                .ifPresent(draft -> allocate(trip, draft));
    }

    /** As {@link #allocate(Trip)}, on any version of the trip's route: one an incident decision just revised. */
    @Transactional
    public void allocate(Trip trip, RoutePlan plan) {
        List<TransportJob> onTrip = jobTrips.jobsOn(trip);
        for (Flight flight : flightsOf(plan)) {
            List<FlightAllocation> gone = flight.getAllocations().stream()
                    .filter(a -> onTrip.stream()
                            .noneMatch(j -> j.getId().equals(a.getJob().getId())))
                    .toList();
            // Deleted explicitly: a flight copied into the draft in this same transaction has no collection
            // snapshot yet, so taking a consignment off its list alone wouldn't delete the row.
            flight.getAllocations().removeAll(gone);
            allocationRows.deleteAll(gone);
            for (TransportJob job : onTrip) {
                if (flight.getAllocations().stream()
                        .noneMatch(a -> a.getJob().getId().equals(job.getId()))) {
                    flight.getAllocations().add(allocationFor(flight, job));
                }
            }
            flights.save(flight);
        }
    }

    /**
     * Why {@code joining}, now on {@code from}, can't fly with {@code trip}, or null (US-F3-15): it must use the same
     * departure and arrival airports, and its stall positions must fit in what the airline gives the trip.
     */
    @Transactional(readOnly = true)
    public String cantFly(Trip trip, Trip from, TransportJob joining) {
        Optional<RoutePlan> hostRoute = currentRoute(trip);
        if (hostRoute.isEmpty()) return null;
        List<Flight> hostFlights = flightsOf(hostRoute.get());
        if (hostFlights.isEmpty()) return null;

        Optional<RoutePlan> ownRoute = currentRoute(from);
        Airports host = airportsOf(hostRoute.get());
        Airports own = ownRoute.map(FlightService::airportsOf).orElse(Airports.NONE);
        if (own.known() && host.known() && !own.sameAs(host)) {
            return joining.getCode() + " flies " + own + " and trip " + trip.getCode() + " flies " + host
                    + ": a shared flight leaves and lands at the same airports";
        }

        int needs = positionsFor(joining);
        for (Flight flight : hostFlights) {
            if (flight.getStallCapacity() == null) continue;
            int used = flight.getAllocations().stream()
                    .filter(a -> !a.getJob().getId().equals(joining.getId()))
                    .map(FlightAllocation::getStallPositions)
                    .filter(Objects::nonNull)
                    .mapToInt(Short::intValue)
                    .sum();
            if (used + needs > flight.getStallCapacity()) {
                return "flight " + flight.getFlightNo() + " has " + Math.max(0, flight.getStallCapacity() - used)
                        + " of " + flight.getStallCapacity() + " stall positions free and " + joining.getCode()
                        + " needs " + needs;
            }
        }
        return null;
    }

    /**
     * What the trip's flight crew lacks, or null (US-F3-15): a flying groom per three horses on the flight, and a
     * flight vet from the catalog's horse threshold, above its high-value threshold, or when a job asked for one.
     */
    @Transactional(readOnly = true)
    public String flightCrewShortfall(Trip trip, RoutePlan confirmed, List<CrewAssignment> crew) {
        List<Flight> onRoute = flightsOf(confirmed);
        if (onRoute.isEmpty()) return null;
        String flight = onRoute.getFirst().getFlightNo();
        int horses = jobTrips.horsesOn(trip).size();
        List<CrewAssignment> flightCrew =
                crew.stream().filter(c -> c.getTripVehicle() == null).toList();
        int grooms = (int) Math.ceil(horses / 3.0);
        long flyingGrooms = flightCrew.stream()
                .filter(c -> c.getCrewRole() == CrewRole.FLYING_GROOM)
                .count();
        if (flyingGrooms < grooms) {
            return "flight " + flight + " requires " + grooms + " flying groom(s) for " + horses + " horses, found "
                    + flyingGrooms;
        }
        String vetBecause = flightVetReason(trip, horses);
        if (vetBecause != null && flightCrew.stream().noneMatch(c -> c.getCrewRole() == CrewRole.VET)) {
            return "flight " + flight + " requires a flight vet (" + vetBecause + ")";
        }
        return null;
    }

    /** Why the flight needs a vet, or null: the same rules the quotation prices it by, for every horse on board. */
    String flightVetReason(Trip trip, int horses) {
        List<TransportJob> onTrip = jobTrips.jobsOn(trip);
        Map<RatePolicyKey, BigDecimal> rules = catalogVersions
                .findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED)
                .map(v -> policies.findByVersionId(v.getId()).stream()
                        .collect(Collectors.toMap(p -> p.getKey(), p -> p.getValue(), (a, b) -> a)))
                .orElse(Map.of());
        BigDecimal minHorses = rules.get(RatePolicyKey.FLIGHT_VET_MIN_HORSES);
        if (minHorses != null && horses >= minHorses.intValue()) {
            return horses + " horses on board";
        }
        BigDecimal threshold = rules.get(RatePolicyKey.HIGH_VALUE_THRESHOLD);
        if (threshold != null
                && onTrip.stream()
                        .flatMap(j -> j.getRequest().getHorses().stream())
                        .map(RequestHorse::getDeclaredValue)
                        .anyMatch(v -> v != null && v.compareTo(threshold) > 0)) {
            return "a horse declared above the high-value threshold";
        }
        return onTrip.stream().anyMatch(j -> j.getRequest().isVetEscort()) ? "a job asked for a vet escort" : null;
    }

    /**
     * Sets one job's consignment on a flight of its trip (US-F3-15): its air waybill, unique on the flight; its stall
     * positions, within what the airline gives the trip; and its service class. Paperwork, so the route doesn't
     * reopen.
     */
    @Transactional
    public FlightAllocation updateAllocation(
            UUID jobId, UUID flightId, UpdateFlightAllocationRequest request, User user) {
        return updateAllocation(jobId, null, flightId, request, user);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional
    public FlightAllocation updateAllocation(
            UUID jobId, UUID tripId, UUID flightId, UpdateFlightAllocationRequest request, User user) {
        TransportJob job = jobs.findById(jobId).orElseThrow(() -> ResourceNotFoundException.of("Job", jobId));
        Trip trip = jobTrips.tripOf(jobId, tripId);
        // The flight of the trip's draft or confirmed route: the job page may show either.
        Flight flight = java.util.stream.Stream.of(RoutePlanStatus.DRAFT, RoutePlanStatus.CONFIRMED)
                .flatMap(status -> routePlans.findByTrip_IdAndStatus(trip.getId(), status).stream())
                .flatMap(route -> flightsOf(route).stream())
                .filter(f -> f.getId().equals(flightId))
                .findFirst()
                .orElseThrow(() -> ResourceNotFoundException.of("Flight", flightId));
        FlightAllocation mine = flight.getAllocations().stream()
                .filter(a -> a.getJob().getId().equals(jobId))
                .findFirst()
                .orElseGet(() -> {
                    FlightAllocation created = allocationFor(flight, job);
                    flight.getAllocations().add(created);
                    return created;
                });
        String waybill = request.airWaybill() == null || request.airWaybill().isBlank()
                ? null
                : request.airWaybill().strip();
        if (waybill != null) {
            flight.getAllocations().stream()
                    .filter(a -> a != mine && waybill.equalsIgnoreCase(a.getAirWaybill()))
                    .findFirst()
                    .ifPresent(a -> {
                        throw new BusinessException("Air waybill " + waybill + " is already "
                                + a.getJob().getCode() + "'s on flight " + flight.getFlightNo());
                    });
        }
        if (flight.getStallCapacity() != null) {
            int others = flight.getAllocations().stream()
                    .filter(a -> a != mine && a.getStallPositions() != null)
                    .mapToInt(a -> a.getStallPositions())
                    .sum();
            if (others + request.stallPositions() > flight.getStallCapacity()) {
                throw new BusinessException("Flight " + flight.getFlightNo() + " gives the trip "
                        + flight.getStallCapacity() + " stall positions and the other jobs take " + others
                        + ": " + job.getCode() + " can have at most " + (flight.getStallCapacity() - others));
            }
        }
        String before = describe(mine);
        mine.setAirWaybill(waybill);
        mine.setStallPositions(request.stallPositions());
        mine.setServiceClass(request.serviceClass());
        flights.save(flight);
        audit.recordDecision(
                user,
                "UPDATE_FLIGHT_ALLOCATION",
                AuditText.fit(job.getCode() + " on flight " + flight.getFlightNo() + ": " + describe(mine)),
                "TRANSPORT_JOB",
                job.getId(),
                job.getCode(),
                null,
                before,
                describe(mine));
        return mine;
    }

    private static String describe(FlightAllocation a) {
        return "AWB " + (a.getAirWaybill() == null ? "not set" : a.getAirWaybill()) + ", "
                + (a.getStallPositions() == null ? "?" : a.getStallPositions()) + " position(s)"
                + (a.getServiceClass() == null
                        ? ""
                        : ", " + a.getServiceClass().name().toLowerCase());
    }

    /**
     * The airports an air route leaves from and lands at: where its first air leg starts and its last one ends. A trip
     * of a job's chain that only flies starts at its pickup and ends at its transfer there (US-F3-16).
     */
    record Airports(Place out, Place in) {
        static final Airports NONE = new Airports(null, null);

        boolean known() {
            return out != null && in != null;
        }

        boolean sameAs(Airports other) {
            return out.getId().equals(other.out.getId()) && in.getId().equals(other.in.getId());
        }

        @Override
        public String toString() {
            return "from " + out.getName() + " to " + in.getName();
        }
    }

    static Airports airportsOf(RoutePlan plan) {
        Place out = null;
        Place in = null;
        for (RouteLeg leg : plan.getLegs().stream()
                .sorted(java.util.Comparator.comparing(RouteLeg::getSeq))
                .toList()) {
            if (leg.getMode() != TransportMode.AIR) continue;
            if (out == null) out = leg.getFromStop().getPlace();
            in = leg.getToStop().getPlace();
        }
        return new Airports(out, in);
    }
}
