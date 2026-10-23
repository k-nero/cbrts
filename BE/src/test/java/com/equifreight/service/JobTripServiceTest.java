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
import com.equifreight.entity.TripVehicle;
import com.equifreight.entity.User;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.TripHorseStatus;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.repository.TripHorseRepository;
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
        service = new JobTripService(trips, tripVehicles, tripHorses, codes);
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
}
