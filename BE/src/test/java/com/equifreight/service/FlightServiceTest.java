package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.CrewRole;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.job.UpdateFlightAllocationRequest;
import com.equifreight.repository.FlightAllocationRepository;
import com.equifreight.repository.FlightRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RatePolicyRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.TransportJobRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F3-15: jobs on one trip share its flight, each with its own consignment. */
class FlightServiceTest {

    private final FlightRepository flights = mock(FlightRepository.class);
    private final FlightAllocationRepository allocationRows = mock(FlightAllocationRepository.class);
    private final RoutePlanRepository routePlans = mock(RoutePlanRepository.class);
    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final JobTripService jobTrips = mock(JobTripService.class);
    private final RateCatalogVersionRepository versions = mock(RateCatalogVersionRepository.class);
    private final RatePolicyRepository policies = mock(RatePolicyRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private FlightService service;

    private final Place sgn = place("Tân Sơn Nhất International Airport");
    private final Place hkg = place("Hong Kong International Airport");
    private final Place pnh = place("Phnom Penh International Airport");
    private Trip trip;
    private Trip own;
    private TransportJob host;
    private TransportJob joining;
    private Flight flight;

    private static Place place(String name) {
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setName(name);
        return p;
    }

    private static Trip trip(String code) {
        Trip t = new Trip();
        t.setId(UUID.randomUUID());
        t.setCode(code);
        return t;
    }

    /** A job with {@code horses} horses, quoted {@code positions} stall positions (none when 0). */
    private static TransportJob job(String code, int horses, int positions) {
        TransportRequest request = new TransportRequest();
        request.setAirClass(ServiceClass.BUSINESS);
        for (int i = 0; i < horses; i++) {
            RequestHorse rh = new RequestHorse();
            Horse h = new Horse();
            h.setId(UUID.randomUUID());
            rh.setHorse(h);
            request.getHorses().add(rh);
        }
        Quotation quotation = new Quotation();
        if (positions > 0) {
            QuotationLine line = new QuotationLine();
            line.setBasis(RateBasis.PER_POSITION);
            line.setQuantity(BigDecimal.valueOf(positions));
            quotation.getLines().add(line);
        }
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode(code);
        job.setRequest(request);
        job.setQuotation(quotation);
        return job;
    }

    /** A route flying {@code out} to {@code in} on one flight; the flight is returned through {@code flights}. */
    private RoutePlan route(Trip t, RoutePlanStatus status, Place out, Place in, Flight onLeg) {
        RoutePlan plan = new RoutePlan();
        plan.setId(UUID.randomUUID());
        plan.setTrip(t);
        plan.setStatus(status);
        RouteStop dep = new RouteStop();
        dep.setKind(RouteStopKind.AIRPORT_OUT);
        dep.setPlace(out);
        RouteStop arr = new RouteStop();
        arr.setKind(RouteStopKind.AIRPORT_IN);
        arr.setPlace(in);
        plan.setStops(new ArrayList<>(List.of(dep, arr)));
        RouteLeg leg = new RouteLeg();
        leg.setId(UUID.randomUUID());
        leg.setMode(TransportMode.AIR);
        leg.setSeq((short) 1);
        plan.setLegs(new ArrayList<>(List.of(leg)));
        when(flights.findByRouteLegId(leg.getId())).thenReturn(Optional.ofNullable(onLeg));
        when(routePlans.findByTrip_IdAndStatus(t.getId(), status)).thenReturn(Optional.of(plan));
        return plan;
    }

    private static FlightAllocation allocation(Flight f, TransportJob job, String awb, int positions) {
        FlightAllocation a = new FlightAllocation();
        a.setFlight(f);
        a.setJob(job);
        a.setAirWaybill(awb);
        a.setStallPositions((short) positions);
        f.getAllocations().add(a);
        return a;
    }

    @BeforeEach
    void setUp() {
        service = new FlightService(flights, allocationRows, routePlans, jobs, jobTrips, versions, policies, audit);
        trip = trip("TRP-2026-010");
        own = trip("TRP-2026-011");
        host = job("CBRT-2026-050", 4, 2);
        joining = job("CBRT-2026-051", 2, 1);
        flight = new Flight();
        flight.setId(UUID.randomUUID());
        flight.setFlightNo("CX766");
        flight.setStallCapacity((short) 4);
        allocation(flight, host, "160-12345675", 2);
        when(routePlans.findByTrip_IdAndStatus(any(), any())).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("A job takes the stall positions its quotation priced, else one per horse")
    void positionsComeFromTheQuotation() {
        assertEquals(2, FlightService.positionsFor(host));
        assertEquals(3, FlightService.positionsFor(job("CBRT-2026-052", 3, 0)));
    }

    @Test
    @DisplayName("A job from the same airports, with room in the flight's stall positions, can fly with the trip")
    void aJobThatFits() {
        route(trip, RoutePlanStatus.CONFIRMED, sgn, hkg, flight);
        route(own, RoutePlanStatus.DRAFT, sgn, hkg, null);

        assertNull(service.cantFly(trip, own, joining));
    }

    @Test
    @DisplayName("A job flying from another airport can't share the flight")
    void anotherAirport() {
        route(trip, RoutePlanStatus.CONFIRMED, sgn, hkg, flight);
        route(own, RoutePlanStatus.DRAFT, pnh, hkg, null);

        assertEquals(
                "CBRT-2026-051 flies from Phnom Penh International Airport to Hong Kong International Airport and trip"
                        + " TRP-2026-010 flies from Tân Sơn Nhất International Airport to Hong Kong International"
                        + " Airport: a shared flight leaves and lands at the same airports",
                service.cantFly(trip, own, joining));
    }

    @Test
    @DisplayName("A job needing more stall positions than the flight has free can't join")
    void noRoomOnTheFlight() {
        route(trip, RoutePlanStatus.CONFIRMED, sgn, hkg, flight);

        assertEquals(
                "flight CX766 has 2 of 4 stall positions free and CBRT-2026-052 needs 3",
                service.cantFly(trip, own, job("CBRT-2026-052", 3, 3)));
    }

    @Test
    @DisplayName("A trip without a flight puts no flight rule on joining")
    void noFlight() {
        assertNull(service.cantFly(trip, own, joining));
    }

    @Test
    @DisplayName("The draft's flight gets a consignment for a job that joined, and loses the one of a job that left")
    void allocationsFollowTheJobs() {
        TransportJob left = job("CBRT-2026-049", 1, 1);
        allocation(flight, left, null, 1);
        route(trip, RoutePlanStatus.DRAFT, sgn, hkg, flight);
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(host, joining));

        service.allocate(trip);

        assertThat(flight.getAllocations())
                .extracting(
                        a -> a.getJob().getCode(), FlightAllocation::getAirWaybill, FlightAllocation::getStallPositions)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("CBRT-2026-050", "160-12345675", (short) 2),
                        org.assertj.core.groups.Tuple.tuple("CBRT-2026-051", null, (short) 1));
        assertEquals(ServiceClass.BUSINESS, flight.getAllocations().get(1).getServiceClass());
        verify(allocationRows).deleteAll(argThat(gone -> ((List<?>) gone).size() == 1));
    }

    @Test
    @DisplayName("A copied flight keeps every job's consignment")
    void copiesKeepTheConsignments() {
        Flight copy = new Flight();

        FlightService.copyAllocations(flight, copy);

        assertEquals("160-12345675", copy.getAllocations().getFirst().getAirWaybill());
        assertEquals(copy, copy.getAllocations().getFirst().getFlight());
    }

    @Test
    @DisplayName("Each job's waybill is its own, and its positions fit in what the airline gives the trip")
    void updatingAConsignment() {
        allocation(flight, joining, null, 1);
        route(trip, RoutePlanStatus.CONFIRMED, sgn, hkg, flight);
        when(jobTrips.tripOf(joining.getId())).thenReturn(trip);
        when(jobs.findById(joining.getId())).thenReturn(Optional.of(joining));
        User khoi = new User();

        BusinessException taken = assertThrows(
                BusinessException.class,
                () -> service.updateAllocation(
                        joining.getId(),
                        flight.getId(),
                        new UpdateFlightAllocationRequest("160-12345675", (short) 1, null),
                        khoi));
        assertEquals("Air waybill 160-12345675 is already CBRT-2026-050's on flight CX766", taken.getMessage());

        BusinessException full = assertThrows(
                BusinessException.class,
                () -> service.updateAllocation(
                        joining.getId(),
                        flight.getId(),
                        new UpdateFlightAllocationRequest("160-87654321", (short) 3, null),
                        khoi));
        assertEquals(
                "Flight CX766 gives the trip 4 stall positions and the other jobs take 2: CBRT-2026-051 can have at"
                        + " most 2",
                full.getMessage());

        FlightAllocation mine = service.updateAllocation(
                joining.getId(),
                flight.getId(),
                new UpdateFlightAllocationRequest(" 160-87654321 ", (short) 2, ServiceClass.FIRST),
                khoi);
        assertEquals("160-87654321", mine.getAirWaybill());
        assertEquals((short) 2, mine.getStallPositions());
        assertEquals(ServiceClass.FIRST, mine.getServiceClass());
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("UPDATE_FLIGHT_ALLOCATION"),
                        eq("CBRT-2026-051 on flight CX766: AWB 160-87654321, 2 position(s), first"),
                        eq("TRANSPORT_JOB"),
                        any(),
                        any(),
                        any(),
                        any(),
                        any());
    }

    private CrewAssignment flightCrew(CrewRole role) {
        CrewAssignment c = new CrewAssignment();
        c.setTrip(trip);
        c.setCrewRole(role);
        return c;
    }

    @Test
    @DisplayName("The flight crew is counted for every horse on board, with a vet from the catalog's threshold")
    void flightCrewForEveryHorse() {
        RoutePlan confirmed = route(trip, RoutePlanStatus.CONFIRMED, sgn, hkg, flight);
        List<TripHorse> eight = new ArrayList<>();
        for (int i = 0; i < 8; i++) eight.add(new TripHorse());
        when(jobTrips.horsesOn(trip)).thenReturn(eight);
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(host, joining));
        RateCatalogVersion published = new RateCatalogVersion();
        published.setId(UUID.randomUUID());
        when(versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED))
                .thenReturn(Optional.of(published));
        RatePolicy minHorses = new RatePolicy();
        minHorses.setKey(RatePolicyKey.FLIGHT_VET_MIN_HORSES);
        minHorses.setValue(new BigDecimal("8"));
        when(policies.findByVersionId(published.getId())).thenReturn(List.of(minHorses));
        CrewAssignment driver = new CrewAssignment();
        driver.setTripVehicle(new TripVehicle());
        driver.setCrewRole(CrewRole.DRIVER);

        assertEquals(
                "flight CX766 requires 3 flying groom(s) for 8 horses, found 2",
                service.flightCrewShortfall(
                        trip,
                        confirmed,
                        List.of(driver, flightCrew(CrewRole.FLYING_GROOM), flightCrew(CrewRole.FLYING_GROOM))));
        List<CrewAssignment> grooms = List.of(
                flightCrew(CrewRole.FLYING_GROOM),
                flightCrew(CrewRole.FLYING_GROOM),
                flightCrew(CrewRole.FLYING_GROOM));
        assertEquals(
                "flight CX766 requires a flight vet (8 horses on board)",
                service.flightCrewShortfall(trip, confirmed, grooms));
        List<CrewAssignment> withVet = new ArrayList<>(grooms);
        withVet.add(flightCrew(CrewRole.VET));
        assertNull(service.flightCrewShortfall(trip, confirmed, withVet));
    }

    @Test
    @DisplayName("A route without a flight needs no flight crew")
    void noFlightNoFlightCrew() {
        RoutePlan road = new RoutePlan();
        assertNull(service.flightCrewShortfall(trip, road, List.of()));
    }
}
