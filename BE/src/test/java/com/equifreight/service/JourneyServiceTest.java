package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Corridor;
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
import com.equifreight.model.job.JourneyCorridorResponse;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TripRepository;
import com.equifreight.repository.VehicleBookingRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F3-21: the coordinator builds a job's journey one trip at a time. */
class JourneyServiceTest {

    private final TransportJobRepository jobs = mock(TransportJobRepository.class);
    private final CorridorRepository corridors = mock(CorridorRepository.class);
    private final PlaceRepository places = mock(PlaceRepository.class);
    private final TripRepository trips = mock(TripRepository.class);
    private final RoutePlanRepository routes = mock(RoutePlanRepository.class);
    private final JobTripService jobTrips = mock(JobTripService.class);
    private final RoutePlanService routePlans = mock(RoutePlanService.class);
    private final AuditService audit = mock(AuditService.class);
    private JourneyService service;

    private final Corridor dadHcm = corridor("RD DAD → HCM", TransportMode.ROAD, "Da Nang", "Ho Chi Minh City");
    private final Corridor sgnHkg = corridor("AIR SGN → HKG", TransportMode.AIR, "Ho Chi Minh City", "Hong Kong");
    private final Corridor hkgShaTin = corridor("RD HKG → Sha Tin", TransportMode.ROAD, "Hong Kong", "Sha Tin");
    private final Corridor pnhHkg = corridor("AIR PNH → HKG", TransportMode.AIR, "Phnom Penh", "Hong Kong");
    private final Place hoaXuan = place("Hòa Xuân racing stables", PlaceKind.STABLE, "Da Nang");
    private final Place shaTin = place("Sha Tin stables", PlaceKind.STABLE, "Sha Tin");
    private final Place sgn = place("Tân Sơn Nhất cargo terminal (SGN)", PlaceKind.CARGO_TERMINAL, "Ho Chi Minh City");
    private final Place hkg = place("HKG cargo terminal", PlaceKind.CARGO_TERMINAL, "Hong Kong");
    private final User khoi = new User();
    private TransportJob job;

    @BeforeEach
    void setUp() {
        service = new JourneyService(
                jobs,
                corridors,
                places,
                trips,
                routes,
                jobTrips,
                routePlans,
                mock(LoadPlanService.class),
                mock(FlightService.class),
                mock(VehicleBookingRepository.class),
                mock(CrewAssignmentRepository.class),
                mock(PlanningDefaults.class),
                audit,
                Clock.fixed(Instant.parse("2026-10-27T03:00:00Z"), ZoneOffset.UTC));
        TransportRequest request = new TransportRequest();
        request.setOriginPlace(hoaXuan);
        request.setDestinationPlace(shaTin);
        request.setFirstLegCorridor(dadHcm);
        request.setCorridor(sgnHkg);
        request.setLastLegCorridor(hkgShaTin);
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-042");
        job.setRequest(request);
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(jobTrips.journey(job)).thenReturn(List.of());
        when(jobTrips.journeyEndCity(job)).thenReturn("Da Nang");
        when(places.findByCityIgnoreCase("Ho Chi Minh City")).thenReturn(List.of(sgn));
        when(places.findByCityIgnoreCase("Hong Kong")).thenReturn(List.of(hkg));
        for (Corridor c : List.of(dadHcm, sgnHkg, hkgShaTin, pnhHkg)) {
            when(corridors.findById(c.getId())).thenReturn(Optional.of(c));
        }
        when(jobTrips.startJourney(eq(job), any(), anyBoolean(), any(), any()))
                .thenAnswer(i -> trip("TRP-2026-002", i.getArgument(1), i.getArgument(2)));
        when(jobTrips.newTrip(any(), anyBoolean(), any(), any()))
                .thenAnswer(i -> trip("TRP-2026-003", i.getArgument(0), i.getArgument(1)));
    }

    @Test
    @DisplayName("The first trip leaves from the origin and hands the horses on in the city it ends short in")
    void theFirstTripHandsOnWhereItEnds() {
        service.addTrip(job.getId(), dadHcm.getId(), khoi);

        verify(jobTrips).startJourney(eq(job), eq(dadHcm), eq(false), eq(khoi), any());
        verify(routePlans)
                .startRoute(any(), eq(job), eq(hoaXuan), eq(RouteStopKind.TRANSFER), eq(sgn), eq(khoi), any());
        verify(audit).recordDecision(eq(khoi), eq("ADD_TRIP"), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("A corridor is run the other way when the journey stands at its destination city")
    void aCorridorIsRunBackwardsFromItsDestination() {
        when(jobTrips.journeyEndCity(job)).thenReturn("Ho Chi Minh City");
        Corridor hcmDad = corridor("RD DAD → HCM", TransportMode.ROAD, "Da Nang", "Ho Chi Minh City");
        when(corridors.findById(hcmDad.getId())).thenReturn(Optional.of(hcmDad));
        job.getRequest().getOriginPlace().setCity("Ho Chi Minh City");
        when(places.findByCityIgnoreCase("Da Nang")).thenReturn(List.of(hoaXuan));

        service.addTrip(job.getId(), hcmDad.getId(), khoi);

        verify(jobTrips).startJourney(eq(job), eq(hcmDad), eq(true), eq(khoi), any());
    }

    @Test
    @DisplayName("A corridor that doesn't touch the city the journey has reached is refused")
    void aCorridorElsewhereIsRefused() {
        assertThatThrownBy(() -> service.addTrip(job.getId(), pnhHkg.getId(), khoi))
                .isInstanceOf(BusinessException.class)
                .hasMessage("AIR PNH → HKG doesn't run from Da Nang, where CBRT-2026-042's journey has reached.");
        verify(jobTrips, never()).startJourney(any(), any(), anyBoolean(), any(), any());
    }

    @Test
    @DisplayName("A later trip collects the horses where the trip before hands them on, and is planned after it")
    void aLaterTripCollectsWhereTheTripBeforeHandsOn() {
        Trip road = trip("TRP-2026-002", dadHcm, false);
        journey(road);
        when(jobTrips.journeyEndCity(job)).thenReturn("Ho Chi Minh City");
        RouteStop transfer = new RouteStop();
        transfer.setKind(RouteStopKind.TRANSFER);
        transfer.setJob(job);
        transfer.setPlace(sgn);
        RoutePlan plan = new RoutePlan();
        plan.getStops().add(transfer);
        when(routes.findByTrip_IdAndStatus(road.getId(), RoutePlanStatus.DRAFT)).thenReturn(Optional.of(plan));

        service.addTrip(job.getId(), sgnHkg.getId(), khoi);

        verify(jobTrips).planNext(eq(job), eq(road), any());
        verify(routePlans).startRoute(any(), eq(job), eq(sgn), eq(RouteStopKind.TRANSFER), eq(hkg), eq(khoi), any());
    }

    @Test
    @DisplayName("The trip that reaches the destination city delivers to the destination place")
    void theLastTripDelivers() {
        journey(trip("TRP-2026-003", sgnHkg, false));
        when(jobTrips.journeyEndCity(job)).thenReturn("Hong Kong");

        service.addTrip(job.getId(), hkgShaTin.getId(), khoi);

        verify(routePlans).startRoute(any(), eq(job), eq(hkg), eq(RouteStopKind.DELIVERY), eq(shaTin), eq(khoi), any());
    }

    @Test
    @DisplayName("No trip can be added once the journey reaches the destination city")
    void aCompleteJourneyTakesNoTrip() {
        journey(trip("TRP-2026-004", hkgShaTin, false));

        assertThatThrownBy(() -> service.addTrip(job.getId(), hkgShaTin.getId(), khoi))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already reaches Sha Tin");
        assertThat(service.nextCorridors(job.getId())).isEmpty();
    }

    @Test
    @DisplayName("The next corridors are read from the city reached, the quoted ones first")
    void theNextCorridorsAreReadFromTheCityReached() {
        Corridor dadHan = corridor("RD DAD → HAN", TransportMode.ROAD, "Da Nang", "Hanoi");
        when(corridors.findTouchingCity("Da Nang")).thenReturn(List.of(dadHan, dadHcm));

        List<JourneyCorridorResponse> next = service.nextCorridors(job.getId());

        assertThat(next)
                .extracting(JourneyCorridorResponse::corridorCode)
                .containsExactly("RD DAD → HCM", "RD DAD → HAN");
        assertThat(next.getFirst().quoted()).isTrue();
        assertThat(next.getFirst().toCity()).isEqualTo("Ho Chi Minh City");
    }

    @Test
    @DisplayName("Only the last trip of the journey is taken off")
    void onlyTheLastTripIsTakenOff() {
        Trip road = trip("TRP-2026-002", dadHcm, false);
        Trip flight = trip("TRP-2026-003", sgnHkg, false);
        journey(road, flight);

        assertThatThrownBy(() -> service.removeTrip(job.getId(), road.getId(), khoi))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only the last trip");
    }

    @Test
    @DisplayName("A departed trip isn't taken off")
    void aDepartedTripStays() {
        Trip road = trip("TRP-2026-002", dadHcm, false);
        journey(road);
        when(jobTrips.partDeparted(road, job)).thenReturn(true);

        assertThatThrownBy(() -> service.removeTrip(job.getId(), road.getId(), khoi))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Trip TRP-2026-002 has departed.");
    }

    @Test
    @DisplayName("Taking off the only trip leaves the job with none, and a trip nobody else rides is deleted")
    void takingOffTheOnlyTripLeavesNone() {
        Trip road = trip("TRP-2026-002", dadHcm, false);
        journey(road);
        when(jobTrips.jobsOn(road)).thenReturn(List.of(job));

        service.removeTrip(job.getId(), road.getId(), khoi);

        verify(jobTrips).leaveJourney(job, road);
        verify(jobTrips, never()).unplan(any(), any());
        verify(trips).deleteTrip(road.getId());
    }

    @Test
    @DisplayName("Taking off a later trip unplans the job there; the trip before keeps handing the horses on")
    void takingOffALaterTripUnplansIt() {
        Trip road = trip("TRP-2026-002", dadHcm, false);
        Trip flight = trip("TRP-2026-003", sgnHkg, false);
        journey(road, flight);
        when(jobTrips.jobsOn(flight)).thenReturn(List.of(job));

        service.removeTrip(job.getId(), flight.getId(), khoi);

        verify(jobTrips).unplan(job, flight);
        verify(trips).deleteTrip(flight.getId());
    }

    @Test
    @DisplayName("The journey warns where it ends short and where it leaves the quoted route")
    void theJourneyWarns() {
        journey(trip("TRP-2026-002", dadHcm, false), trip("TRP-2026-003", pnhHkg, true));

        assertThat(service.warnings(job))
                .containsExactly(
                        "Ends in Phnom Penh; the horses go to Sha Tin. Add a trip from Phnom Penh.",
                        "Quoted by way of RD DAD → HCM, AIR SGN → HKG, RD HKG → Sha Tin; this journey runs AIR PNH → HKG."
                                + " The price was worked out on the quoted route.");
    }

    private void journey(Trip... legs) {
        List<TripJob> parts = new java.util.ArrayList<>();
        for (Trip t : legs) {
            TripJob p = new TripJob();
            p.setId(UUID.randomUUID());
            p.setTrip(t);
            p.setJob(job);
            parts.add(p);
        }
        when(jobTrips.journey(job)).thenReturn(parts);
    }

    private static Trip trip(String code, Corridor corridor, boolean reversed) {
        Trip t = new Trip();
        t.setId(UUID.randomUUID());
        t.setCode(code);
        t.setCorridor(corridor);
        t.setReversed(reversed);
        return t;
    }

    private static Corridor corridor(String code, TransportMode mode, String from, String to) {
        Corridor c = new Corridor();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setMode(mode);
        c.setOriginCity(from);
        c.setDestinationCity(to);
        return c;
    }

    private static Place place(String name, PlaceKind kind, String city) {
        Place p = new Place();
        p.setId(UUID.randomUUID());
        p.setName(name);
        p.setKind(kind);
        p.setCity(city);
        return p;
    }
}
