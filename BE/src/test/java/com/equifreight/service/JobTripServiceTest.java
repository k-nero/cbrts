package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.Horse;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.TripVehicle;
import com.equifreight.entity.User;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripHorseStatus;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.repository.TripHorseRepository;
import com.equifreight.repository.TripJobRepository;
import com.equifreight.repository.TripRepository;
import com.equifreight.repository.TripVehicleRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** US-F3-09: every job travels on a trip. */
class JobTripServiceTest {

    private final TripRepository trips = mock(TripRepository.class);
    private final TripVehicleRepository tripVehicles = mock(TripVehicleRepository.class);
    private final TripHorseRepository tripHorses = mock(TripHorseRepository.class);
    private final CodeService codes = mock(CodeService.class);
    private final TripJobRepository parts = mock(TripJobRepository.class);
    private JobTripService service;

    private static Horse horse(String name) {
        Horse horse = new Horse();
        horse.setId(UUID.randomUUID());
        horse.setName(name);
        return horse;
    }

    private static Vehicle vehicle(String code) {
        Vehicle vehicle = new Vehicle();
        vehicle.setId(UUID.randomUUID());
        vehicle.setCode(code);
        return vehicle;
    }

    @BeforeEach
    void setUp() {
        service = new JobTripService(trips, tripVehicles, tripHorses, parts, codes);
        when(parts.save(any())).thenAnswer(i -> i.getArgument(0));
        when(trips.save(any())).thenAnswer(i -> i.getArgument(0));
        when(tripVehicles.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    @DisplayName("An approved job gets a trip of its own on its corridor, with every horse of the request on it")
    void anApprovedJobGetsItsOwnTrip() {
        Corridor corridor = new Corridor();
        TransportRequest request = new TransportRequest();
        request.setCorridor(corridor);
        Horse shadowfax = horse("Shadowfax");
        Horse nightfall = horse("Nightfall");
        for (Horse h : List.of(shadowfax, nightfall)) {
            RequestHorse rh = new RequestHorse();
            rh.setHorse(h);
            request.getHorses().add(rh);
        }
        TransportJob job = new TransportJob();
        job.setRequest(request);
        User yen = new User();
        // 31 Dec 2026, 17:30 UTC is 1 Jan 2027 in Ho Chi Minh City.
        when(codes.next(CodePrefix.TRP, 2027)).thenReturn("TRP-2027-001");

        Trip trip = service.createForJob(job, yen, Instant.parse("2026-12-31T17:30:00Z"));

        assertThat(trip.getCode()).isEqualTo("TRP-2027-001");
        assertThat(trip.getCorridor()).isSameAs(corridor);
        assertThat(trip.getStatus()).isEqualTo(TripStatus.NOT_STARTED);
        assertThat(trip.getCreatedBy()).isSameAs(yen);
        ArgumentCaptor<TripHorse> onTrip = ArgumentCaptor.forClass(TripHorse.class);
        verify(tripHorses, org.mockito.Mockito.times(2)).save(onTrip.capture());
        assertThat(onTrip.getAllValues())
                .allMatch(th -> th.getTrip() == trip && th.getJob() == job && th.getStatus() == TripHorseStatus.ON_TRIP)
                .extracting(TripHorse::getHorse)
                .containsExactly(shadowfax, nightfall);
    }

    @Test
    @DisplayName("Choosing another vehicle replaces the trip's vehicle in place, so its crew stays")
    void anotherVehicleReplacesTheTripsVehicle() {
        Trip trip = new Trip();
        trip.setId(UUID.randomUUID());
        TripVehicle current = new TripVehicle();
        current.setTrip(trip);
        current.setVehicle(vehicle("TX-447"));
        current.setSeq((short) 1);
        when(tripVehicles.findByTrip_IdOrderBySeq(trip.getId())).thenReturn(List.of(current));
        Vehicle tx512 = vehicle("TX-512");

        TripVehicle used = service.useVehicle(trip, tx512);

        assertThat(used).isSameAs(current);
        assertThat(used.getVehicle()).isSameAs(tx512);
    }

    @Test
    @DisplayName("A trip's first vehicle is added as the first of its convoy")
    void theFirstVehicleIsAdded() {
        Trip trip = new Trip();
        trip.setId(UUID.randomUUID());
        when(tripVehicles.findByTrip_IdOrderBySeq(trip.getId())).thenReturn(List.of());
        Vehicle tx447 = vehicle("TX-447");

        TripVehicle used = service.useVehicle(trip, tx447);

        assertThat(used.getTrip()).isSameAs(trip);
        assertThat(used.getVehicle()).isSameAs(tx447);
        assertThat(used.getSeq()).isEqualTo((short) 1);
    }

    @Test
    @DisplayName("Delivered horses come off the trip")
    void deliveredHorsesComeOffTheTrip() {
        Trip trip = new Trip();
        trip.setId(UUID.randomUUID());
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        TripHorse onTrip = new TripHorse();
        when(tripHorses.findByTrip_IdAndJob_IdAndStatus(trip.getId(), job.getId(), TripHorseStatus.ON_TRIP))
                .thenReturn(List.of(onTrip));

        service.markDelivered(trip, job);

        assertThat(onTrip.getStatus()).isEqualTo(TripHorseStatus.DELIVERED);
    }

    @Test
    @DisplayName("A job's trip is found through its horses")
    void aJobsTripIsFoundThroughItsHorses() {
        Trip trip = new Trip();
        UUID jobId = UUID.randomUUID();
        when(trips.findCurrentByJobId(jobId)).thenReturn(Optional.of(trip));

        assertThat(service.tripOf(jobId)).isSameAs(trip);
    }

    // ---------- a job split across trips (US-F5-06) ----------

    private static Trip trip(String code) {
        Trip t = new Trip();
        t.setId(UUID.randomUUID());
        t.setCode(code);
        return t;
    }

    private static TripHorse row(Trip trip, TransportJob job, Horse horse, TripHorseStatus status) {
        TripHorse th = new TripHorse();
        th.setTrip(trip);
        th.setJob(job);
        th.setHorse(horse);
        th.setStatus(status);
        return th;
    }

    private static TripJob part(Trip trip, TransportJob job, TripStatus status, Instant departed) {
        TripJob p = new TripJob();
        p.setTrip(trip);
        p.setJob(job);
        p.setStatus(status);
        p.setDepartedAt(departed);
        return p;
    }

    private TransportJob splitJob(TripHorseStatus first, TripStatus firstStatus, TripStatus secondStatus) {
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setStage(JobStage.TRIP);
        Trip moving = trip("TRP-2026-001");
        Trip later = trip("TRP-2026-005");
        Horse shadowfax = horse("Shadowfax");
        Horse nightfall = horse("Nightfall");
        when(tripHorses.findByJob_IdOrderByCreatedAt(job.getId()))
                .thenReturn(List.of(
                        row(moving, job, shadowfax, TripHorseStatus.MOVED),
                        row(moving, job, nightfall, first),
                        row(later, job, shadowfax, TripHorseStatus.ON_TRIP)));
        Instant left = Instant.parse("2026-10-18T06:00:00Z");
        when(parts.findByJob_IdOrderByCreatedAt(job.getId()))
                .thenReturn(List.of(part(moving, job, firstStatus, left), part(later, job, secondStatus, null)));
        return job;
    }

    @Test
    @DisplayName("A job whose other part waits to continue is still on its way, from its first departure")
    void aSplitJobIsOnItsWay() {
        TransportJob job = splitJob(TripHorseStatus.DELIVERED, TripStatus.DELIVERED, TripStatus.NOT_STARTED);
        job.setDeliveredAt(Instant.parse("2026-10-18T09:00:00Z"));

        service.summarize(job);

        assertThat(job.getTripStatus()).isEqualTo(TripStatus.DEPARTED);
        assertThat(job.getStage()).isEqualTo(JobStage.TRIP);
        assertThat(job.getDeliveredAt()).isNull();
        assertThat(job.getDepartedAt()).isEqualTo(Instant.parse("2026-10-18T06:00:00Z"));
    }

    @Test
    @DisplayName("A held part holds the job; a job is delivered only when every horse is handed over or in care")
    void deliveredWhenEveryHorseIs() {
        TransportJob held = splitJob(TripHorseStatus.ON_TRIP, TripStatus.HELD, TripStatus.NOT_STARTED);
        service.summarize(held);
        assertThat(held.getTripStatus()).isEqualTo(TripStatus.HELD);

        TransportJob done = new TransportJob();
        done.setId(UUID.randomUUID());
        done.setStage(JobStage.TRIP);
        Trip t = trip("TRP-2026-001");
        when(tripHorses.findByJob_IdOrderByCreatedAt(done.getId()))
                .thenReturn(List.of(
                        row(t, done, horse("Shadowfax"), TripHorseStatus.DELIVERED),
                        row(t, done, horse("Nightfall"), TripHorseStatus.LEFT_IN_CARE)));
        when(parts.findByJob_IdOrderByCreatedAt(done.getId()))
                .thenReturn(List.of(part(t, done, TripStatus.DELIVERED, Instant.parse("2026-10-18T06:00:00Z"))));

        service.summarize(done);

        assertThat(done.getTripStatus()).isEqualTo(TripStatus.DELIVERED);
        assertThat(done.getStage()).isEqualTo(JobStage.HANDOVER);
    }

    @Test
    @DisplayName("Moving some of a job's horses leaves MOVED rows, puts them on the new trip and opens the part")
    void someHorsesMove() {
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        Trip moving = trip("TRP-2026-001");
        Trip later = trip("TRP-2026-005");
        Horse shadowfax = horse("Shadowfax");
        Horse nightfall = horse("Nightfall");
        TripHorse s = row(moving, job, shadowfax, TripHorseStatus.ON_TRIP);
        TripHorse n = row(moving, job, nightfall, TripHorseStatus.ON_TRIP);
        when(tripHorses.findByTrip_IdAndJob_IdAndStatus(moving.getId(), job.getId(), TripHorseStatus.ON_TRIP))
                .thenReturn(List.of(s, n));
        when(parts.findByTrip_IdAndJob_Id(later.getId(), job.getId())).thenReturn(Optional.empty());

        service.moveHorses(job, List.of(shadowfax.getId()), moving, later);

        assertThat(s.getStatus()).isEqualTo(TripHorseStatus.MOVED);
        assertThat(n.getStatus()).isEqualTo(TripHorseStatus.ON_TRIP);
        ArgumentCaptor<TripHorse> added = ArgumentCaptor.forClass(TripHorse.class);
        verify(tripHorses).save(added.capture());
        assertThat(added.getValue().getTrip()).isSameAs(later);
        assertThat(added.getValue().getHorse()).isSameAs(shadowfax);
        ArgumentCaptor<TripJob> opened = ArgumentCaptor.forClass(TripJob.class);
        verify(parts).save(opened.capture());
        assertThat(opened.getValue().getTrip()).isSameAs(later);
        assertThat(opened.getValue().getStatus()).isEqualTo(TripStatus.NOT_STARTED);
    }

    @Test
    @DisplayName("A horse left in care is accounted for on its trip")
    void leftInCare() {
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        Trip moving = trip("TRP-2026-001");
        Horse nightfall = horse("Nightfall");
        TripHorse n = row(moving, job, nightfall, TripHorseStatus.ON_TRIP);
        when(tripHorses.findByTrip_IdAndJob_IdAndStatus(moving.getId(), job.getId(), TripHorseStatus.ON_TRIP))
                .thenReturn(List.of(n));

        service.leaveInCare(moving, job, List.of(nightfall.getId()));

        assertThat(n.getStatus()).isEqualTo(TripHorseStatus.LEFT_IN_CARE);
    }

    @Test
    @DisplayName("Signing off a trip signs off every job's part on it; a change clears them")
    void signOffIsPerPart() {
        Trip t = trip("TRP-2026-005");
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        TripHorse th = row(t, job, horse("Shadowfax"), TripHorseStatus.ON_TRIP);
        when(tripHorses.findByTrip_IdAndStatusOrderByCreatedAt(t.getId(), TripHorseStatus.ON_TRIP))
                .thenReturn(List.of(th));
        TripJob p = part(t, job, TripStatus.NOT_STARTED, null);
        when(parts.findByTrip_IdAndJob_Id(t.getId(), job.getId())).thenReturn(Optional.of(p));
        User yen = new User();
        Instant at = Instant.parse("2026-10-20T03:00:00Z");

        service.signOff(t, yen, at);
        assertThat(p.getSignedOffAt()).isEqualTo(at);
        assertThat(p.released()).isTrue();
        assertThat(job.getSignedOffAt()).isEqualTo(at);

        service.clearSignOff(t);
        assertThat(p.getSignedOffAt()).isNull();
        assertThat(job.getSignedOffAt()).isNull();
    }
}
