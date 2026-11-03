package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.enums.*;
import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.job.BiosecurityWarningResponse;
import com.equifreight.model.job.JoinableTripResponse;
import com.equifreight.model.job.ShareSuggestionResponse;
import com.equifreight.model.job.ShareTripResponse;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TripRepository;
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
    private FlightService flights;

    @Mock
    private TripNotices notices;

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

    @Mock
    private TripRepository trips;

    @Mock
    private ChecklistItemRepository checklist;

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
        lenient().when(jobTrips.tripOf(eq(job.getId()), isNull())).thenReturn(trip);
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
        // A job's part departs with the job while it is on one trip.
        lenient().when(jobTrips.partDeparted(any(), any())).thenAnswer(inv -> {
            TransportJob j = inv.getArgument(1);
            return j.getDepartedAt() != null || j.getTripStatus() != TripStatus.NOT_STARTED;
        });
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
                notices,
                flights,
                trips,
                checklist,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    @DisplayName("A job lists the confirmed trips it fits, each with its clearance state and earliest open deadline")
    void joinableTripsShowTheirClearance() {
        host.setDossierStatus(DossierStatus.CLEARANCE_READY);
        TransportJob stuck = job("CBRT-2026-043", LocalDate.of(2026, 12, 2), 3, hostTrip);
        when(jobTrips.jobsOn(hostTrip)).thenReturn(List.of(host, stuck));
        ChecklistItem owed = new ChecklistItem();
        owed.setStatus(ChecklistStatus.AWAITING_UPLOAD);
        owed.setDueDate(LocalDate.of(2026, 11, 20));
        ChecklistItem done = new ChecklistItem();
        done.setStatus(ChecklistStatus.CLEARED);
        done.setDueDate(LocalDate.of(2026, 11, 10));
        when(checklist.findByJobId(stuck.getId())).thenReturn(List.of(owed, done));
        when(trips.findJoinable(corridor.getId(), joiningTrip.getId())).thenReturn(List.of(hostTrip));
        when(loadPlans.stallsLeft(hostTrip, joining)).thenReturn(2);

        List<JoinableTripResponse> joinable = service.joinable(joining.getId(), null);

        assertThat(joinable).singleElement().satisfies(t -> {
            assertThat(t.tripCode()).isEqualTo("TRP-2026-001");
            assertThat(t.jobs()).containsExactly("CBRT-2026-041", "CBRT-2026-043");
            assertThat(t.jobsCleared()).isEqualTo(1);
            assertThat(t.documentsDueBy()).isEqualTo(LocalDate.of(2026, 11, 20));
            assertThat(t.stallsLeft()).isEqualTo(2);
            assertThat(t.departFrom()).isEqualTo(LocalDate.of(2026, 11, 30));
            assertThat(t.departTo()).isEqualTo(LocalDate.of(2026, 12, 4));
        });
    }

    @Test
    @DisplayName("A trip the job doesn't fit (a private trailer here) is listed after the others, with the reason")
    void aTripTheJobDoesntFitShowsWhy() {
        Trip privateTrip = trip("TRP-2026-007");
        privateTrip.setCorridor(corridor);
        TransportJob alone = job("CBRT-2026-047", LocalDate.of(2026, 12, 2), 3, privateTrip);
        alone.getRequest().setTrailer(TrailerType.PRIVATE);
        when(jobTrips.jobsOn(privateTrip)).thenReturn(List.of(alone));
        when(trips.findJoinable(corridor.getId(), joiningTrip.getId())).thenReturn(List.of(privateTrip, hostTrip));

        List<JoinableTripResponse> listed = service.joinable(joining.getId(), null);

        assertThat(listed).extracting(JoinableTripResponse::tripCode).containsExactly("TRP-2026-001", "TRP-2026-007");
        assertThat(listed.get(0).fits()).isTrue();
        assertThat(listed.get(1)).satisfies(t -> {
            assertThat(t.fits()).isFalse();
            assertThat(t.reason()).isEqualTo("CBRT-2026-047's customer booked a private trailer, so it travels alone");
            assertThat(t.departFrom()).isNull();
            assertThat(t.warnings()).isEmpty();
            assertThat(t.jobs()).containsExactly("CBRT-2026-047");
        });
    }

    @Test
    @DisplayName("Joining a confirmed trip from the joining job's side moves it there, as sharing from the host does")
    void aJobJoinsAConfirmedTrip() {
        when(trips.findById(hostTrip.getId())).thenReturn(Optional.of(hostTrip));

        ShareTripResponse result = service.join(joining.getId(), null, hostTrip.getId(), List.of(), khoi);

        assertThat(result.tripCode()).isEqualTo("TRP-2026-001");
        verify(jobTrips).moveJob(joining, joiningTrip, hostTrip);
        verify(routePlans).copyJobStops(joiningTrip, hostTrip, joining);
        verify(loadPlans).reopenTrip(eq(hostTrip), any());
    }

    @Test
    @DisplayName("On a later trip of its journey, a job's days come from that trip's own pickup, not its request")
    void aLaterTripLeavesOnItsOwnDay() {
        TripJob part = new TripJob();
        when(jobTrips.partBefore(joiningTrip, joining)).thenReturn(Optional.of(part));
        corridor.setDateFlexDays((short) 1);
        // The flight leaves a week after the job's requested day; the host's request allows 8 Dec ± 1 day.
        when(routePlans.pickupOn(joiningTrip, joining)).thenReturn(Optional.of(Instant.parse("2026-12-08T02:00:00Z")));
        host.getRequest().setDepartureDate(LocalDate.of(2026, 12, 8));
        host.getRequest().setDateFlexDays((short) 1);
        when(trips.findJoinable(corridor.getId(), joiningTrip.getId())).thenReturn(List.of(hostTrip));

        assertThat(service.joinable(joining.getId(), null)).singleElement().satisfies(t -> {
            assertThat(t.departFrom()).isEqualTo(LocalDate.of(2026, 12, 7));
            assertThat(t.departTo()).isEqualTo(LocalDate.of(2026, 12, 9));
        });
    }

    @Test
    @DisplayName("On a later trip of its journey, a job can't leave before the trip before has its horses ready")
    void aLaterTripLeavesNoEarlierThanTheHandOn() {
        TripJob part = new TripJob();
        when(jobTrips.partBefore(joiningTrip, joining)).thenReturn(Optional.of(part));
        corridor.setDateFlexDays((short) 1);
        when(routePlans.pickupOn(joiningTrip, joining)).thenReturn(Optional.of(Instant.parse("2026-12-08T02:00:00Z")));
        // The horses are out of quarantine on 8 Dec, so 7 Dec is no longer a day they could leave.
        when(routePlans.readyOn(joiningTrip, joining)).thenReturn(Optional.of(Instant.parse("2026-12-08T01:00:00Z")));
        host.getRequest().setDepartureDate(LocalDate.of(2026, 12, 8));
        host.getRequest().setDateFlexDays((short) 1);
        when(trips.findJoinable(corridor.getId(), joiningTrip.getId())).thenReturn(List.of(hostTrip));

        assertThat(service.joinable(joining.getId(), null)).singleElement().satisfies(t -> {
            assertThat(t.departFrom()).isEqualTo(LocalDate.of(2026, 12, 8));
            assertThat(t.departTo()).isEqualTo(LocalDate.of(2026, 12, 9));
        });
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
        verify(routePlans).copyJobStops(joiningTrip, hostTrip, joining);
        verify(flights).allocate(hostTrip);
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
    @DisplayName("A job that can't fly with the trip (other airports, no stall positions left) can't join it")
    void aJobThatCantFlyStaysOff() {
        when(flights.cantFly(hostTrip, joiningTrip, joining))
                .thenReturn("flight CX766 has 1 of 4 stall positions free and CBRT-2026-042 needs 2");

        ConflictException ex = assertThrows(
                ConflictException.class, () -> service.share(host.getId(), joining.getId(), List.of(), khoi));

        assertEquals("FLIGHT_DOESNT_FIT", ex.getCode());
        assertEquals(
                "CBRT-2026-042 can't fly with trip TRP-2026-001: flight CX766 has 1 of 4 stall positions free and"
                        + " CBRT-2026-042 needs 2",
                ex.getMessage());
        verify(jobTrips, never()).moveJob(any(), any(), any());
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
        verify(crew).deleteByTripId(joiningTrip.getId());
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
        joiningTrip.setCorridor(other);

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
        when(jobTrips.newTrip(corridor, false, khoi, NOW)).thenReturn(own);
        joining.setSignedOffAt(NOW);

        service.takeOff(host.getId(), joining.getId(), khoi);

        verify(loadPlans).unload(hostTrip, List.of(joiningHorse.getHorse().getId()));
        verify(jobTrips).moveJob(joining, hostTrip, own);
        verify(loadPlans).reopenTrip(hostTrip, "CBRT-2026-042 taken off the trip");
        verify(routePlans).removeJobStops(hostTrip, joining);
        assertThat(joining.getSignedOffAt()).isNull();
        verify(notices).replanned(joining, hostTrip);
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
        verify(jobTrips, never()).newTrip(any(), org.mockito.ArgumentMatchers.anyBoolean(), any(), any());
    }

    // ---------- suggestions (US-F3-13) ----------

    private TransportJob candidate(String code, LocalDate departure) {
        Trip own = trip("TRP-2026-0" + code.substring(code.length() - 2));
        own.setCorridor(corridor);
        TransportJob job = job(code, departure, 3, own);
        RequestHorse rh = new RequestHorse();
        rh.setHorse(horse(own, job).getHorse());
        job.getRequest().getHorses().add(rh);
        when(jobTrips.jobsOn(own)).thenReturn(List.of(job));
        return job;
    }

    @Test
    @DisplayName("Suggestions are the jobs that pass every check, with departure, horses, stalls left and warnings")
    void suggestionsPassEveryCheck() {
        TransportJob fits = candidate("CBRT-2026-043", LocalDate.of(2026, 12, 3));
        TransportJob tooLate = candidate("CBRT-2026-044", LocalDate.of(2026, 12, 20));
        TransportJob privateTrailer = candidate("CBRT-2026-045", LocalDate.of(2026, 12, 1));
        privateTrailer.getRequest().setTrailer(TrailerType.PRIVATE);
        TransportJob noRoom = candidate("CBRT-2026-046", LocalDate.of(2026, 12, 1));
        when(loadPlans.lackOfRoom(hostTrip, noRoom)).thenReturn("no stall left");
        when(jobs.findShareCandidates(corridor.getId()))
                .thenReturn(List.of(host, fits, tooLate, privateTrailer, noRoom));
        when(loadPlans.stallsLeft(hostTrip, fits)).thenReturn(1);
        List<BiosecurityWarningResponse> warnings = List.of(BiosecurityWarningResponse.builder()
                .key("k")
                .kind("ISOLATION")
                .message("mixes isolation groups")
                .build());
        when(biosecurity.forJoin(hostTrip, fits)).thenReturn(warnings);

        List<ShareSuggestionResponse> suggestions = service.suggestions(host.getId());

        assertThat(suggestions).singleElement().satisfies(s -> {
            assertEquals("CBRT-2026-043", s.job().code());
            // 041 can leave 28 Nov to 4 Dec, 043 from 30 Nov to 6 Dec; the trip has no planned day yet.
            assertEquals(LocalDate.of(2026, 11, 30), s.proposedDeparture());
            assertEquals(LocalDate.of(2026, 12, 4), s.departTo());
            assertEquals(1, s.horsesAdded());
            assertEquals(1, s.stallsLeft());
            assertEquals(warnings, s.warnings());
        });
        verify(jobTrips, never()).moveJob(any(), any(), any());
    }

    @Test
    @DisplayName("The proposed departure keeps the trip's planned day when the joining job allows it")
    void proposedDepartureKeepsThePlannedDay() {
        TransportJob fits = candidate("CBRT-2026-043", LocalDate.of(2026, 12, 3));
        when(jobs.findShareCandidates(corridor.getId())).thenReturn(List.of(fits));
        hostTrip.setPlannedDepartureAt(Instant.parse("2026-12-02T01:00:00Z"));

        assertEquals(
                LocalDate.of(2026, 12, 2),
                service.suggestions(host.getId()).getFirst().proposedDeparture());
    }

    @Test
    @DisplayName("A trip that has departed suggests nothing")
    void aDepartedTripSuggestsNothing() {
        host.setTripStatus(TripStatus.DEPARTED);
        when(jobs.findShareCandidates(corridor.getId())).thenReturn(List.of(joining));

        assertThat(service.suggestions(host.getId())).isEmpty();
    }
}
