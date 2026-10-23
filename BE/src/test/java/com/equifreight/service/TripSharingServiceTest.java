package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.job.BiosecurityWarningResponse;
import com.equifreight.model.job.ShareTripResponse;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.VehicleBookingRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/** US-F3-11: sharing a trailer between jobs. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TripSharingServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-20T03:00:00Z");

    @Mock
    private TransportJobRepository jobs;

    @Mock
    private JobTripService jobTrips;

    @Mock
    private LoadPlanService loadPlans;

    @Mock
    private RoutePlanService routePlans;

    @Mock
    private VehicleBookingRepository bookings;

    @Mock
    private CrewAssignmentRepository crew;

    @Mock
    private AuditService audit;

    @Mock
    private BiosecurityService biosecurity;

    private TripSharingService service;

    private final Corridor corridor = new Corridor();
    private final Trip hostTrip = trip("TRP-2026-001");
    private final Trip joiningTrip = trip("TRP-2026-002");
    private TransportJob host;
    private TransportJob joining;
    private final User khoi = new User();

    private static Trip trip(String code) {
        Trip trip = new Trip();
        trip.setId(UUID.randomUUID());
        trip.setCode(code);
        return trip;
    }

    private TransportJob job(String code, LocalDate departure, int flexDays, Trip trip) {
        TransportRequest request = new TransportRequest();
        request.setCorridor(corridor);
        request.setTrailer(TrailerType.SHARED);
        request.setDepartureDate(departure);
        request.setDateFlexDays((short) flexDays);
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode(code);
        job.setRequest(request);
        job.setTripStatus(TripStatus.NOT_STARTED);
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(jobTrips.tripOf(job.getId())).thenReturn(trip);
        return job;
    }

    private static TripHorse horse(Trip trip, TransportJob job) {
        Horse horse = new Horse();
        horse.setId(UUID.randomUUID());
        TripHorse th = new TripHorse();
        th.setTrip(trip);
        th.setJob(job);
        th.setHorse(horse);
        return th;
    }

    @BeforeEach
    void setUp() {
        corridor.setId(UUID.randomUUID());
        hostTrip.setCorridor(corridor);
        joiningTrip.setCorridor(corridor);
        host = job("CBRT-2026-041", LocalDate.of(2026, 12, 1), 3, hostTrip);
        joining = job("CBRT-2026-042", LocalDate.of(2026, 12, 3), 3, joiningTrip);
        when(jobTrips.jobsOn(hostTrip)).thenReturn(List.of(host));
        // Once its horses moved, nobody rides the trip it left.
        when(jobTrips.jobsOn(joiningTrip)).thenReturn(List.of());
        when(jobTrips.horsesOn(joiningTrip)).thenReturn(List.of(horse(joiningTrip, joining)));
        service = new TripSharingService(
                jobs,
                jobTrips,
                loadPlans,
                routePlans,
                bookings,
                crew,
                audit,
                biosecurity,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    @DisplayName("A job joins another job's trip on the days both allow, and the trip reopens with its stops")
    void aJobJoinsTheTrip() {
        ShareTripResponse result = service.share(host.getId(), joining.getId(), List.of(), khoi);

        // 041 can leave 28 Nov to 4 Dec, 042 from 30 Nov to 6 Dec.
        assertEquals(LocalDate.of(2026, 11, 30), result.departFrom());
        assertEquals(LocalDate.of(2026, 12, 4), result.departTo());
        assertThat(result.jobs()).extracting(j -> j.code()).containsExactly("CBRT-2026-041", "CBRT-2026-042");
        verify(jobTrips).moveJob(joining, joiningTrip, hostTrip);
        verify(loadPlans).reopenTrip(hostTrip, "CBRT-2026-042 joined the trip");
        verify(routePlans).addJobStops(hostTrip, joining);
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("SHARE_TRIP"),
                        any(),
                        eq("TRIP"),
                        eq(hostTrip.getId()),
                        eq("TRP-2026-001"),
                        any(),
                        eq("TRP-2026-002"),
                        eq("TRP-2026-001"));
    }

    @Test
    @DisplayName("The trip the job left, now empty, releases its trailers' bookings and crew")
    void theEmptyTripIsReleased() {
        TripVehicle tv = new TripVehicle();
        tv.setId(UUID.randomUUID());
        VehicleBooking booking = new VehicleBooking();
        when(bookings.findByTrip_Id(joiningTrip.getId())).thenReturn(List.of(booking));
        when(jobTrips.vehiclesOf(joiningTrip)).thenReturn(List.of(tv));

        service.share(host.getId(), joining.getId(), List.of(), khoi);

        verify(bookings).deleteAll(List.of(booking));
        verify(crew).deleteByTripVehicleId(tv.getId());
        verify(loadPlans, never()).reopenTrip(eq(joiningTrip), any());
    }

    @Test
    @DisplayName("A job whose customer booked a private trailer travels alone")
    void privateTrailersDontShare() {
        joining.getRequest().setTrailer(TrailerType.PRIVATE);

        BusinessException ex = assertThrows(
                BusinessException.class, () -> service.share(host.getId(), joining.getId(), List.of(), khoi));

        assertThat(ex.getMessage()).contains("CBRT-2026-042").contains("private trailer");
        verify(jobTrips, never()).moveJob(any(), any(), any());
    }

    @Test
    @DisplayName("A job on another corridor can't join")
    void anotherCorridorCantJoin() {
        Corridor other = new Corridor();
        other.setId(UUID.randomUUID());
        joining.getRequest().setCorridor(other);

        assertThrows(BusinessException.class, () -> service.share(host.getId(), joining.getId(), List.of(), khoi));
        verify(jobTrips, never()).moveJob(any(), any(), any());
    }

    @Test
    @DisplayName("When no departure day suits both jobs, the app says whose dates rule it out")
    void datesThatDontFit() {
        joining.getRequest().setDepartureDate(LocalDate.of(2026, 12, 20));

        ConflictException ex = assertThrows(
                ConflictException.class, () -> service.share(host.getId(), joining.getId(), List.of(), khoi));

        assertEquals("DATES_DONT_FIT", ex.getCode());
        assertThat(ex.getMessage())
                .contains("CBRT-2026-042 can leave between 17 Dec and 23 Dec")
                .contains("CBRT-2026-041 between 28 Nov and 4 Dec");
    }

    @Test
    @DisplayName("Not enough room asks for another trailer instead of failing silently")
    void notEnoughRoomAsksForATrailer() {
        when(loadPlans.lackOfRoom(hostTrip, joining))
                .thenReturn("5 horses need a stall and the trip's trailers have 4");

        ConflictException ex = assertThrows(
                ConflictException.class, () -> service.share(host.getId(), joining.getId(), List.of(), khoi));

        assertEquals("NEEDS_ANOTHER_TRAILER", ex.getCode());
        assertThat(ex.getMessage()).contains("Add a trailer");
        verify(jobTrips, never()).moveJob(any(), any(), any());
    }

    @Test
    @DisplayName("A horse booked on both jobs can't ride the trip twice")
    void aHorseOnBothJobs() {
        TripHorse onJoining = horse(joiningTrip, joining);
        onJoining.getHorse().setName("Copper King");
        TripHorse onHost = horse(hostTrip, host);
        onHost.setHorse(onJoining.getHorse());
        when(jobTrips.horsesOn(joiningTrip)).thenReturn(List.of(onJoining));
        when(jobTrips.horsesOn(hostTrip)).thenReturn(List.of(onHost));

        BusinessException ex = assertThrows(
                BusinessException.class, () -> service.share(host.getId(), joining.getId(), List.of(), khoi));

        assertThat(ex.getMessage()).contains("Copper King").contains("CBRT-2026-041");
        verify(jobTrips, never()).moveJob(any(), any(), any());
    }

    @Test
    @DisplayName("Unaccepted biosecurity warnings stop the share before anything moves (US-F3-12)")
    void biosecurityWarningsAreAcceptedFirst() {
        List<BiosecurityWarningResponse> warnings = List.of(BiosecurityWarningResponse.builder()
                .key("k1")
                .kind("ISOLATION")
                .message("TRP-2026-001: isolation mismatch")
                .build());
        when(biosecurity.forJoin(hostTrip, joining)).thenReturn(warnings);
        doThrow(new ConflictException("BIOSECURITY_WARNINGS", "Accept them"))
                .when(biosecurity)
                .requireAccepted(hostTrip, warnings, List.of(), khoi);

        assertThrows(ConflictException.class, () -> service.share(host.getId(), joining.getId(), List.of(), khoi));
        verify(jobTrips, never()).moveJob(any(), any(), any());

        service.share(host.getId(), joining.getId(), List.of("k1"), khoi);
        verify(biosecurity).requireAccepted(hostTrip, warnings, List.of("k1"), khoi);
        verify(jobTrips).moveJob(joining, joiningTrip, hostTrip);
    }

    @Test
    @DisplayName("A job can't join a trip that has departed")
    void noJoiningAfterDeparture() {
        host.setTripStatus(TripStatus.DEPARTED);
        host.setDepartedAt(NOW);

        assertThrows(BusinessException.class, () -> service.share(host.getId(), joining.getId(), List.of(), khoi));
        verify(jobTrips, never()).moveJob(any(), any(), any());
    }

    @Test
    @DisplayName("A stuck job is taken off onto a trip of its own, and the trip it left reopens without its stops")
    void aJobIsTakenOff() {
        when(jobTrips.jobsOn(hostTrip)).thenReturn(List.of(host, joining));
        TripHorse joiningHorse = horse(hostTrip, joining);
        when(jobTrips.horsesOn(hostTrip)).thenReturn(List.of(horse(hostTrip, host), joiningHorse));
        Trip own = trip("TRP-2026-003");
        when(jobTrips.newTripFor(joining, khoi, NOW)).thenReturn(own);
        joining.setSignedOffAt(NOW);

        service.takeOff(host.getId(), joining.getId(), khoi);

        verify(loadPlans).unload(hostTrip, List.of(joiningHorse.getHorse().getId()));
        verify(jobTrips).moveJob(joining, hostTrip, own);
        verify(loadPlans).reopenTrip(hostTrip, "CBRT-2026-042 taken off the trip");
        verify(routePlans).removeJobStops(hostTrip, joining);
        assertThat(joining.getSignedOffAt()).isNull();
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("UNSHARE_TRIP"),
                        any(),
                        eq("TRIP"),
                        eq(hostTrip.getId()),
                        any(),
                        any(),
                        eq("TRP-2026-001"),
                        eq("TRP-2026-003"));
    }

    @Test
    @DisplayName("A job alone on its trip has nothing to be taken off")
    void aJobAloneStays() {
        assertThrows(BusinessException.class, () -> service.takeOff(host.getId(), host.getId(), khoi));
        verify(jobTrips, never()).newTripFor(any(), any(), any());
    }

    @Test
    @DisplayName("The jobs that could join leave out the ones already on the trip")
    void candidatesLeaveOutTheTripsJobs() {
        when(jobs.findShareCandidates(corridor.getId())).thenReturn(List.of(host, joining));

        assertThat(service.candidates(host.getId())).extracting(j -> j.code()).containsExactly("CBRT-2026-042");
    }
}
