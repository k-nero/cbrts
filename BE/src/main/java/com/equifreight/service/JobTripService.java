package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.TripVehicle;
import com.equifreight.entity.User;
import com.equifreight.entity.Vehicle;
import com.equifreight.entity.enums.CodePrefix;
import com.equifreight.entity.enums.TripHorseStatus;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.repository.TripHorseRepository;
import com.equifreight.repository.TripRepository;
import com.equifreight.repository.TripVehicleRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The trip a job travels on (US-F3-09, docs/shared-trips-design.md). Every job is approved onto a trip of its own, so
 * a job that shares nothing is a trip with one job and one vehicle.
 */
@Service
public class JobTripService {

    private final TripRepository trips;
    private final TripVehicleRepository tripVehicles;
    private final TripHorseRepository tripHorses;
    private final CodeService codeService;

    public JobTripService(
            TripRepository trips,
            TripVehicleRepository tripVehicles,
            TripHorseRepository tripHorses,
            CodeService codeService) {
        this.trips = trips;
        this.tripVehicles = tripVehicles;
        this.tripHorses = tripHorses;
        this.codeService = codeService;
    }

    /**
     * The approved job's own trip, on the request's corridor, with every horse of the request on it.
     */
    @Transactional
    public Trip createForJob(TransportJob job, User createdBy, Instant at) {
        Trip trip = new Trip();
        trip.setCode(
                codeService.next(CodePrefix.TRP, at.atZone(BusinessTime.ZONE).getYear()));
        trip.setCorridor(job.getRequest().getCorridor());
        trip.setCreatedBy(createdBy);
        trip = trips.save(trip);
        for (RequestHorse requestHorse : job.getRequest().getHorses()) {
            TripHorse onTrip = new TripHorse();
            onTrip.setTrip(trip);
            onTrip.setJob(job);
            onTrip.setHorse(requestHorse.getHorse());
            tripHorses.save(onTrip);
        }
        return trip;
    }

    @Transactional(readOnly = true)
    public Optional<Trip> findTripOf(UUID jobId) {
        return trips.findCurrentByJobId(jobId);
    }

    @Transactional(readOnly = true)
    public Trip tripOf(UUID jobId) {
        return findTripOf(jobId).orElseThrow(() -> ResourceNotFoundException.of("Trip of job", jobId));
    }

    /**
     * The trip's vehicle. A trip has one until convoys (US-F3-10); empty until the load plan names it.
     */
    @Transactional(readOnly = true)
    public Optional<TripVehicle> vehicleOf(Trip trip) {
        return tripVehicles.findByTrip_IdOrderBySeq(trip.getId()).stream().findFirst();
    }

    /**
     * Puts {@code vehicle} on the trip: the trip's vehicle is replaced, keeping its crew, or added when it has none.
     */
    @Transactional
    public TripVehicle useVehicle(Trip trip, Vehicle vehicle) {
        TripVehicle tripVehicle = vehicleOf(trip).orElseGet(() -> {
            TripVehicle added = new TripVehicle();
            added.setTrip(trip);
            added.setSeq((short) 1);
            return added;
        });
        tripVehicle.setVehicle(vehicle);
        return tripVehicles.save(tripVehicle);
    }

    /**
     * The job's horses on {@code trip} have arrived: they are no longer on a trip.
     */
    @Transactional
    public void markDelivered(Trip trip, TransportJob job) {
        for (TripHorse onTrip :
                tripHorses.findByTrip_IdAndJob_IdAndStatus(trip.getId(), job.getId(), TripHorseStatus.ON_TRIP)) {
            onTrip.setStatus(TripHorseStatus.DELIVERED);
        }
    }
}
