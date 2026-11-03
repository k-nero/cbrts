package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.repository.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F5-03: an approved incident option gives the trip a new confirmed route version with later times. */
class RouteIncidentRevisionTest {

    private static final Instant PICKUP = Instant.parse("2026-10-18T06:00:00Z");

    private final RoutePlanRepository plans = mock(RoutePlanRepository.class);
    private final RouteStopRepository stops = mock(RouteStopRepository.class);
    private final RouteLegRepository legs = mock(RouteLegRepository.class);
    private final FlightRepository flights = mock(FlightRepository.class);
    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final JobTripService jobTrips = mock(JobTripService.class);
    private final AuditService audit = mock(AuditService.class);
    private RoutePlanService service;

    private final Trip trip = new Trip();
    private final RoutePlan confirmed = new RoutePlan();
    private final TransportJob job = new TransportJob();
    private RouteStop pickup;
    private RouteStop border;
    private RouteStop delivery;

    private RouteStop stop(int seq, RouteStopKind kind, TransportJob owner, long hoursAfterPickup) {
        RouteStop stop = new RouteStop();
        stop.setId(UUID.randomUUID());
        stop.setRoutePlan(confirmed);
        stop.setSeq((short) seq);
        stop.setKind(kind);
        stop.setJob(owner);
        stop.setPlannedAt(PICKUP.plusSeconds(3600 * hoursAfterPickup));
        confirmed.getStops().add(stop);
        return stop;
    }

    @BeforeEach
    void setUp() {
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-2026-001");
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setDepartedAt(PICKUP);
        job.setPlannedDepartureAt(PICKUP);
        confirmed.setId(UUID.randomUUID());
        confirmed.setTrip(trip);
        confirmed.setVersionNo((short) 2);
        confirmed.setStatus(RoutePlanStatus.CONFIRMED);
        pickup = stop(1, RouteStopKind.PICKUP, job, 0);
        border = stop(2, RouteStopKind.BORDER, null, 3);
        delivery = stop(3, RouteStopKind.DELIVERY, job, 7);
        job.setPlannedArrivalAt(delivery.getPlannedAt());
        when(plans.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(confirmed));
        when(plans.findFirstByTrip_IdOrderByVersionNoDesc(trip.getId())).thenReturn(Optional.of(confirmed));
        when(plans.save(any())).thenAnswer(i -> i.getArgument(0));
        when(stops.save(any())).thenAnswer(i -> i.getArgument(0));
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(job));
        service = new RoutePlanService(
                plans,
                stops,
                legs,
                flights,
                jobs,
                mock(PlaceRepository.class),
                mock(BorderCrossingRepository.class),
                mock(VehicleRepository.class),
                mock(ClearanceService.class),
                jobTrips,
                audit,
                mock(TripNotices.class),
                PlanningStub.planningDefaults());
    }

    @Test
    @DisplayName("The stops not yet reached move by the delay in a new confirmed version, and the arrival follows")
    void theRemainingStopsMove() {
        User yen = new User();

        Optional<RoutePlan> revised = service.reviseForIncident(
                trip, 90, Set.of(pickup.getId()), "Incident on CBRT-2026-041: second trailer", yen);

        assertThat(confirmed.getStatus()).isEqualTo(RoutePlanStatus.SUPERSEDED);
        RoutePlan v3 = revised.orElseThrow();
        assertThat(v3.getVersionNo()).isEqualTo((short) 3);
        assertThat(v3.getStatus()).isEqualTo(RoutePlanStatus.CONFIRMED);
        assertThat(v3.getConfirmedBy()).isEqualTo(yen);
        assertThat(v3.getStops())
                .extracting(RouteStop::getPlannedAt)
                .containsExactly(PICKUP, PICKUP.plusSeconds(3 * 3600 + 5400), PICKUP.plusSeconds(7 * 3600 + 5400));
        assertThat(job.getPlannedArrivalAt()).isEqualTo(PICKUP.plusSeconds(7 * 3600 + 5400));
        // A moving job keeps its departure.
        assertThat(job.getPlannedDepartureAt()).isEqualTo(PICKUP);
        verify(audit)
                .recordDecision(
                        eq(yen),
                        eq("REVISE_ROUTE_PLAN"),
                        any(),
                        eq("ROUTE_PLAN"),
                        any(),
                        any(),
                        any(),
                        eq("v2"),
                        eq("v3"));
    }

    @Test
    @DisplayName("A trip without a confirmed route has nothing to revise")
    void noConfirmedRoute() {
        when(plans.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.empty());

        assertThat(service.reviseForIncident(trip, 90, Set.of(), "x", new User()))
                .isEmpty();
    }

    @Test
    @DisplayName("A job whose horses all left loses its stops not yet reached; the trip keeps the rest")
    void aLeavingJobsStopsGo() {
        TransportJob staying = new TransportJob();
        staying.setId(UUID.randomUUID());
        delivery.setJob(staying);
        RouteStop leavingDelivery = stop(4, RouteStopKind.DELIVERY, job, 9);
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(staying));
        when(legs.save(any())).thenAnswer(i -> i.getArgument(0));
        when(flights.findByRouteLegId(any())).thenReturn(Optional.empty());

        RoutePlan v3 = service.reviseForIncident(
                        trip, 0, Set.of(pickup.getId()), "Incident: unloaded", new User(), Set.of(job.getId()))
                .orElseThrow();

        // The pickup was reached, so it stays in the record; the job's delivery ahead is gone.
        assertThat(v3.getStops())
                .extracting(RouteStop::getKind)
                .containsExactly(RouteStopKind.PICKUP, RouteStopKind.BORDER, RouteStopKind.DELIVERY);
        assertThat(v3.getStops().getLast().getJob()).isSameAs(staying);
        assertThat(leavingDelivery.getRoutePlan()).isSameAs(confirmed);
    }

    @Test
    @DisplayName("On a moving trip the pickups count as passed, recorded or not")
    void aMovingTripsPickupsStay() {
        trip.setStatus(com.equifreight.entity.enums.TripStatus.DEPARTED);

        RoutePlan v3 = service.reviseForIncident(trip, 60, Set.of(), "Incident", new User())
                .orElseThrow();

        assertThat(v3.getStops().getFirst().getPlannedAt()).isEqualTo(PICKUP);
        assertThat(v3.getStops().getLast().getPlannedAt()).isEqualTo(PICKUP.plusSeconds(8 * 3600));
    }
}
