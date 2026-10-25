package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.repository.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F3-11: a job joining or leaving a trip changes the stops of the trip's draft route. */
class RouteJobStopsTest {

    private final RoutePlanRepository plans = mock(RoutePlanRepository.class);
    private final RouteStopRepository stops = mock(RouteStopRepository.class);
    private final RouteLegRepository legs = mock(RouteLegRepository.class);
    private final FlightRepository flights = mock(FlightRepository.class);
    private RoutePlanService service;

    private final Trip trip = new Trip();
    private final RoutePlan draft = new RoutePlan();
    private final TransportJob a = job("CBRT-2026-041", "Phú Thọ training centre", "Phnom Penh Equestrian Centre");
    private final TransportJob b = job("CBRT-2026-042", "Củ Chi stables", "Phnom Penh Royal Stables");
    private final Vehicle tx447 = new Vehicle();

    private static TransportJob job(String code, String origin, String destination) {
        Place from = new Place();
        from.setName(origin);
        Place to = new Place();
        to.setName(destination);
        TransportRequest request = new TransportRequest();
        request.setOriginPlace(from);
        request.setDestinationPlace(to);
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode(code);
        job.setRequest(request);
        return job;
    }

    private RouteStop stop(int seq, RouteStopKind kind, TransportJob job, Place place) {
        RouteStop stop = new RouteStop();
        stop.setId(UUID.randomUUID());
        stop.setRoutePlan(draft);
        stop.setSeq((short) seq);
        stop.setKind(kind);
        stop.setJob(job);
        stop.setPlace(place);
        stop.setPlannedAt(Instant.parse("2026-12-01T01:00:00Z").plusSeconds(3600L * seq));
        draft.getStops().add(stop);
        return stop;
    }

    private void leg(int seq, RouteStop from, RouteStop to) {
        RouteLeg leg = new RouteLeg();
        leg.setId(UUID.randomUUID());
        leg.setSeq((short) seq);
        leg.setFromStop(from);
        leg.setToStop(to);
        leg.setMode(TransportMode.ROAD);
        leg.setVehicle(tx447);
        leg.setDistanceKm(80);
        draft.getLegs().add(leg);
    }

    @BeforeEach
    void setUp() {
        trip.setId(UUID.randomUUID());
        tx447.setCode("TX-447");
        RouteStop pickup = stop(1, RouteStopKind.PICKUP, a, a.getRequest().getOriginPlace());
        RouteStop border = stop(2, RouteStopKind.BORDER, null, null);
        RouteStop delivery = stop(3, RouteStopKind.DELIVERY, a, a.getRequest().getDestinationPlace());
        leg(1, pickup, border);
        leg(2, border, delivery);
        when(plans.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT)).thenReturn(Optional.of(draft));
        when(flights.findByRouteLegId(any())).thenReturn(Optional.empty());
        when(stops.save(any())).thenAnswer(i -> i.getArgument(0));
        when(legs.save(any())).thenAnswer(i -> i.getArgument(0));
        service = new RoutePlanService(
                plans,
                stops,
                legs,
                flights,
                mock(TransportJobRepository.class),
                mock(PlaceRepository.class),
                mock(BorderCrossingRepository.class),
                mock(VehicleRepository.class),
                mock(ClearanceService.class),
                mock(JobTripService.class),
                mock(AuditService.class),
                mock(TripNotices.class));
    }

    @Test
    @DisplayName("A joining job's pickup follows the pickups and its delivery the deliveries, each naming the job")
    void aJoiningJobsStops() {
        service.addJobStops(trip, b);

        assertThat(draft.getStops())
                .extracting(s -> s.getSeq() + " " + s.getKind() + " "
                        + (s.getJob() == null ? "-" : s.getJob().getCode()))
                .containsExactly(
                        "1 PICKUP CBRT-2026-041",
                        "2 PICKUP CBRT-2026-042",
                        "3 BORDER -",
                        "4 DELIVERY CBRT-2026-041",
                        "5 DELIVERY CBRT-2026-042");
        assertThat(draft.getStops().get(1).getPlace().getName()).isEqualTo("Củ Chi stables");
        assertThat(draft.getStops().get(1).getPlannedAt()).isNull();
        // The border-to-delivery leg was already there and keeps its trailer and distance; the new ones wait to be
        // planned.
        assertThat(draft.getLegs())
                .extracting(l -> l.getSeq() + " "
                        + (l.getVehicle() == null ? "-" : l.getVehicle().getCode()) + " " + l.getDistanceKm())
                .containsExactly("1 - null", "2 - null", "3 TX-447 80", "4 - null");
    }

    @Test
    @DisplayName("A leaving job's stops come off the route, and its neighbours are joined")
    void aLeavingJobsStops() {
        service.addJobStops(trip, b);
        service.removeJobStops(trip, b);

        assertThat(draft.getStops())
                .extracting(s -> s.getSeq() + " " + s.getKind())
                .containsExactly("1 PICKUP", "2 BORDER", "3 DELIVERY");
        assertThat(draft.getLegs()).hasSize(2);
        assertThat(draft.getStops()).allMatch(s -> s.getJob() == null || s.getJob() == a);
    }

    @Test
    @DisplayName(
            "A job joining a trip that flies from its airport stands beside the trip's own stops there, so the flight"
                    + " still leaves from the airport (US-F3-18)")
    void aJobJoiningAFlightKeepsTheFlight() {
        Place airport = new Place();
        airport.setId(UUID.randomUUID());
        airport.setName("Techo International Airport cargo");
        Place hkg = new Place();
        hkg.setId(UUID.randomUUID());
        hkg.setName("HKIA animal reception");
        draft.getStops().clear();
        draft.getLegs().clear();
        RouteStop up = stop(1, RouteStopKind.PICKUP, a, airport);
        RouteStop off = stop(2, RouteStopKind.TRANSFER, a, hkg);
        RouteLeg flight = new RouteLeg();
        flight.setId(UUID.randomUUID());
        flight.setSeq((short) 1);
        flight.setFromStop(up);
        flight.setToStop(off);
        flight.setMode(TransportMode.AIR);
        draft.getLegs().add(flight);
        // b's own flight trip, which it leaves for a's.
        Trip bTrip = new Trip();
        bTrip.setId(UUID.randomUUID());
        RoutePlan bPlan = new RoutePlan();
        for (RouteStop st : List.of(
                own(bPlan, 1, RouteStopKind.PICKUP, b, airport), own(bPlan, 2, RouteStopKind.TRANSFER, b, hkg))) {
            bPlan.getStops().add(st);
        }
        when(plans.findByTrip_IdAndStatus(bTrip.getId(), RoutePlanStatus.DRAFT)).thenReturn(Optional.of(bPlan));

        service.copyJobStops(bTrip, trip, b);

        assertThat(draft.getStops())
                .extracting(s -> s.getKind() + " " + s.getJob().getCode())
                .containsExactly(
                        "PICKUP CBRT-2026-042",
                        "PICKUP CBRT-2026-041",
                        "TRANSFER CBRT-2026-041",
                        "TRANSFER CBRT-2026-042");
        assertThat(draft.getLegs()).extracting(l -> l.getMode().name()).containsExactly("ROAD", "AIR", "ROAD");
    }

    private static RouteStop own(RoutePlan plan, int seq, RouteStopKind kind, TransportJob job, Place place) {
        RouteStop stop = new RouteStop();
        stop.setId(UUID.randomUUID());
        stop.setRoutePlan(plan);
        stop.setSeq((short) seq);
        stop.setKind(kind);
        stop.setJob(job);
        stop.setPlace(place);
        return stop;
    }
}
