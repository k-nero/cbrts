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
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.repository.TripHorseRepository;
import com.equifreight.repository.TripRepository;
import com.equifreight.repository.TripVehicleRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
     * The trip's first vehicle; empty until the load plan names it.
     */
    @Transactional(readOnly = true)
    public Optional<TripVehicle> vehicleOf(Trip trip) {
        return vehiclesOf(trip).stream().findFirst();
    }

    /** The trip's vehicles in convoy order (US-F3-10). */
    @Transactional(readOnly = true)
    public List<TripVehicle> vehiclesOf(Trip trip) {
        return tripVehicles.findByTrip_IdOrderBySeq(trip.getId());
    }

    /** The horses on the trip now, of every job on it, in the order they joined. */
    @Transactional(readOnly = true)
    public List<TripHorse> horsesOn(Trip trip) {
        return tripHorses.findByTrip_IdAndStatusOrderByCreatedAt(trip.getId(), TripHorseStatus.ON_TRIP);
    }

    /** Every horse that rode the trip, delivered or moved ones included, in the order they joined. */
    @Transactional(readOnly = true)
    public List<TripHorse> horsesEverOn(Trip trip) {
        return tripHorses.findByTrip_IdOrderByCreatedAt(trip.getId());
    }

    /** The jobs with horses on the trip now. */
    @Transactional(readOnly = true)
    public List<TransportJob> jobsOn(Trip trip) {
        return horsesOn(trip).stream().map(TripHorse::getJob).distinct().toList();
    }

    /**
     * Adds {@code vehicle} to the trip's convoy, after its last vehicle.
     */
    @Transactional
    public TripVehicle addVehicle(Trip trip, Vehicle vehicle) {
        List<TripVehicle> current = vehiclesOf(trip);
        if (current.stream().anyMatch(tv -> tv.getVehicle().getId().equals(vehicle.getId())))
            throw new BusinessException("Vehicle " + vehicle.getCode() + " is already on trip " + trip.getCode());
        TripVehicle added = new TripVehicle();
        added.setTrip(trip);
        added.setVehicle(vehicle);
        added.setSeq(
                (short) (current.stream().mapToInt(TripVehicle::getSeq).max().orElse(0) + 1));
        return tripVehicles.save(added);
    }

    /** Takes a vehicle off the trip. The caller has removed its load plan and crew first. */
    @Transactional
    public void removeVehicle(TripVehicle tripVehicle) {
        tripVehicle.getTrip().getVehicles().remove(tripVehicle);
        tripVehicles.delete(tripVehicle);
        tripVehicles.flush();
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
     * A new trip for {@code job} alone, on its request's corridor, with no horses yet: the job's horses move onto it
     * with {@link #moveJob}.
     */
    @Transactional
    public Trip newTripFor(TransportJob job, User createdBy, Instant at) {
        Trip trip = new Trip();
        trip.setCode(
                codeService.next(CodePrefix.TRP, at.atZone(BusinessTime.ZONE).getYear()));
        trip.setCorridor(job.getRequest().getCorridor());
        trip.setCreatedBy(createdBy);
        return trips.save(trip);
    }

    /**
     * Moves the job's horses from {@code from} to {@code to} before departure (US-F3-11). Their rows on {@code from}
     * stay as MOVED, so history shows where they were; a horse that rode {@code to} before is put back on it.
     */
    @Transactional
    public List<UUID> moveJob(TransportJob job, Trip from, Trip to) {
        List<TripHorse> moving =
                tripHorses.findByTrip_IdAndJob_IdAndStatus(from.getId(), job.getId(), TripHorseStatus.ON_TRIP);
        for (TripHorse onTrip : moving) {
            onTrip.setStatus(TripHorseStatus.MOVED);
        }
        tripHorses.saveAllAndFlush(moving);
        Map<UUID, TripHorse> before = new HashMap<>();
        for (TripHorse earlier : tripHorses.findByTrip_IdOrderByCreatedAt(to.getId())) {
            before.put(earlier.getHorse().getId(), earlier);
        }
        for (TripHorse moved : moving) {
            TripHorse onTrip = before.get(moved.getHorse().getId());
            if (onTrip == null) {
                onTrip = new TripHorse();
                onTrip.setTrip(to);
                onTrip.setHorse(moved.getHorse());
            }
            onTrip.setJob(job);
            onTrip.setStatus(TripHorseStatus.ON_TRIP);
            tripHorses.save(onTrip);
        }
        tripHorses.flush();
        return moving.stream().map(th -> th.getHorse().getId()).toList();
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
