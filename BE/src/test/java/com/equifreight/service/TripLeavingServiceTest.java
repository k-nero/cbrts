package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.LeavingKind;
import com.equifreight.entity.enums.TripHorseStatus;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.incident.AddIncidentOptionRequest;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.LoadPlanRepository;
import com.equifreight.repository.VehicleBookingRepository;
import com.equifreight.repository.VehicleRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** US-F5-06: a job, or some of its horses, leaves a moving trip through an incident decision. */
class TripLeavingServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-18T09:00:00Z");

    private final JobTripService jobTrips = mock(JobTripService.class);
    private final LoadPlanService loadPlans = mock(LoadPlanService.class);
    private final LoadPlanRepository loadPlanRows = mock(LoadPlanRepository.class);
    private final CrewAssignmentRepository crew = mock(CrewAssignmentRepository.class);
    private final VehicleBookingRepository bookings = mock(VehicleBookingRepository.class);
    private final VehicleRepository vehicles = mock(VehicleRepository.class);
    private TripLeavingService service;

    private Trip trip;
    private Trip later;
    private TransportJob job;
    private TransportJob other;
    private Horse shadowfax;
    private Horse nightfall;
    private Horse ivory;
    private TripJob part;

    private static Horse horse(String name) {
        Horse h = new Horse();
        h.setId(UUID.randomUUID());
        h.setName(name);
        return h;
    }

    private TripHorse rider(TransportJob owner, Horse horse) {
        TripHorse th = new TripHorse();
        th.setTrip(trip);
        th.setJob(owner);
        th.setHorse(horse);
        th.setStatus(TripHorseStatus.ON_TRIP);
        return th;
    }

    private static TransportJob job(String code) {
        TransportJob j = new TransportJob();
        j.setId(UUID.randomUUID());
        j.setCode(code);
        return j;
    }

    /** A trailer on the trip, loaded with {@code horses}. */
    private LoadPlan trailer(String code, Horse... horses) {
        Vehicle v = new Vehicle();
        v.setId(UUID.randomUUID());
        v.setCode(code);
        TripVehicle tv = new TripVehicle();
        tv.setId(UUID.randomUUID());
        tv.setTrip(trip);
        tv.setVehicle(v);
        LoadPlan plan = new LoadPlan();
        plan.setTripVehicle(tv);
        for (Horse h : horses) {
            LoadPlanStall stall = new LoadPlanStall();
            stall.setHorse(h);
            plan.getStalls().add(stall);
        }
        return plan;
    }

    private static AddIncidentOptionRequest request(LeavingKind kind, List<UUID> horses, String place, UUID vehicle) {
        return new AddIncidentOptionRequest(
                "Leave Nightfall at the Gò Dầu clinic",
                null,
                BigDecimal.ZERO,
                0,
                false,
                kind,
                horses,
                place,
                vehicle,
                true);
    }

    @BeforeEach
    void setUp() {
        service = new TripLeavingService(jobTrips, loadPlans, loadPlanRows, crew, bookings, vehicles);
        trip = new Trip();
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-2026-001");
        later = new Trip();
        later.setId(UUID.randomUUID());
        later.setCode("TRP-2026-009");
        job = job("CBRT-2026-041");
        other = job("CBRT-2026-042");
        shadowfax = horse("Shadowfax");
        nightfall = horse("Nightfall");
        ivory = horse("Ivory Bay");
        part = new TripJob();
        part.setTrip(trip);
        part.setJob(job);
        part.setStatus(TripStatus.DEPARTED);
        when(jobTrips.activePartsOf(job)).thenReturn(List.of(part));
        when(jobTrips.partDeparted(trip, job)).thenReturn(true);
        when(jobTrips.horsesOn(trip))
                .thenReturn(List.of(rider(job, shadowfax), rider(job, nightfall), rider(other, ivory)));
        when(jobTrips.newTripFor(eq(job), any(), eq(NOW))).thenReturn(later);
    }

    @Test
    @DisplayName("The moving trip is the job's part on the road")
    void theMovingTrip() {
        assertEquals(trip, service.movingTrip(job));
    }

    @Test
    @DisplayName("An option names some of the job's horses, or all of them, with where they go")
    void preparingAnOption() {
        IncidentOption some = new IncidentOption();
        service.prepare(
                job, some, request(LeavingKind.LEAVE_IN_CARE, List.of(nightfall.getId()), " Gò Dầu clinic ", null));
        assertThat(some.getHorses()).containsExactly(nightfall);
        assertEquals("Gò Dầu clinic", some.getLeavingPlace());
        assertThat(some.isChangesRoute()).isTrue();
        assertThat(some.isCustomerPays()).isTrue();

        IncidentOption all = new IncidentOption();
        service.prepare(job, all, request(LeavingKind.RETURN_TO_ORIGIN, List.of(), null, null));
        assertThat(all.getHorses()).containsExactlyInAnyOrder(shadowfax, nightfall);
    }

    @Test
    @DisplayName("Only the job's own horses on a trip that has departed can leave, with a place or a vehicle")
    void whatCanLeave() {
        assertThrows(
                BusinessException.class,
                () -> service.prepare(
                        job,
                        new IncidentOption(),
                        request(LeavingKind.UNLOAD, List.of(ivory.getId()), "Clinic", null)));
        assertThrows(
                BusinessException.class,
                () -> service.prepare(job, new IncidentOption(), request(LeavingKind.UNLOAD, List.of(), null, null)));
        assertThrows(
                BusinessException.class,
                () -> service.prepare(
                        job, new IncidentOption(), request(LeavingKind.SECOND_VEHICLE, List.of(), null, null)));
        when(jobTrips.partDeparted(trip, job)).thenReturn(false);
        BusinessException early = assertThrows(
                BusinessException.class,
                () -> service.prepare(
                        job, new IncidentOption(), request(LeavingKind.RETURN_TO_ORIGIN, List.of(), null, null)));
        assertEquals(
                "Trip TRP-2026-001 hasn't departed: before departure, take CBRT-2026-041 off it on the Load plan tab",
                early.getMessage());
    }

    private IncidentOption option(LeavingKind kind, Horse... horses) {
        IncidentOption o = new IncidentOption();
        o.setLeavingKind(kind);
        o.setHorses(Set.of(horses));
        return o;
    }

    @Test
    @DisplayName("A horse left in care stays on the trip as LEFT_IN_CARE, off its stall, with no new trip")
    void leftInCare() {
        TripLeavingService.Departure d =
                service.leave(trip, job, option(LeavingKind.LEAVE_IN_CARE, nightfall), new User(), NOW);

        assertNull(d.newTrip());
        assertThat(d.jobLeftTrip()).isFalse();
        verify(jobTrips).leaveInCare(trip, job, Set.of(nightfall.getId()));
        verify(loadPlans).unload(trip, Set.of(nightfall.getId()));
        verify(jobTrips).summarize(job);
        verify(jobTrips, never()).newTripFor(any(), any(), any());
    }

    @Test
    @DisplayName("Unloaded to continue later, the horses move to a new trip; a trailer with only them goes along")
    void unloadedToContinueLater() {
        LoadPlan theirs = trailer("TK-102", shadowfax, nightfall);
        LoadPlan shared = trailer("TX-447", ivory);
        when(loadPlanRows.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of(shared, theirs));
        CrewAssignment hoa = new CrewAssignment();
        hoa.setTrip(trip);
        when(crew.findByTripVehicle_Id(theirs.getTripVehicle().getId())).thenReturn(List.of(hoa));
        VehicleBooking booking = new VehicleBooking();
        booking.setTrip(trip);
        when(bookings.findByTrip_IdAndVehicle_Id(
                        trip.getId(), theirs.getTripVehicle().getVehicle().getId()))
                .thenReturn(Optional.of(booking));
        when(jobTrips.horsesOn(trip)).thenReturn(List.of(rider(other, ivory)));

        TripLeavingService.Departure d =
                service.leave(trip, job, option(LeavingKind.UNLOAD, shadowfax, nightfall), new User(), NOW);

        assertEquals(later, d.newTrip());
        assertThat(d.jobLeftTrip()).isTrue();
        verify(jobTrips).moveVehicle(theirs.getTripVehicle(), later);
        verify(jobTrips, never()).moveVehicle(shared.getTripVehicle(), later);
        assertEquals(later, hoa.getTrip());
        assertEquals(later, booking.getTrip());
        verify(jobTrips).moveHorses(job, Set.of(shadowfax.getId(), nightfall.getId()), trip, later);
        assertEquals(List.of("Nightfall", "Shadowfax"), d.horses());
    }

    @Test
    @DisplayName("A second vehicle collects one horse as a new trip; the job's other horse carries on")
    void aSecondVehicle() {
        Vehicle tk102 = new Vehicle();
        tk102.setId(UUID.randomUUID());
        when(loadPlanRows.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of(trailer("TX-447", shadowfax, nightfall, ivory)));
        when(jobTrips.vehiclesOf(later)).thenReturn(List.of());
        IncidentOption o = option(LeavingKind.SECOND_VEHICLE, nightfall);
        o.setVehicle(tk102);

        TripLeavingService.Departure d = service.leave(trip, job, o, new User(), NOW);

        assertThat(d.jobLeftTrip()).isFalse();
        verify(jobTrips, never()).moveVehicle(any(), any());
        verify(jobTrips).addVehicle(later, tk102);
        verify(loadPlans).unload(trip, Set.of(nightfall.getId()));
    }
}
