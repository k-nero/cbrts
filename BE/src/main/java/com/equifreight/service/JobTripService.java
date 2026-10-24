package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportJob;
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
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.repository.TripHorseRepository;
import com.equifreight.repository.TripJobRepository;
import com.equifreight.repository.TripRepository;
import com.equifreight.repository.TripVehicleRepository;
import java.time.Instant;
import java.util.Collection;
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
    private final TripJobRepository parts;
    private final CodeService codeService;

    public JobTripService(
            TripRepository trips,
            TripVehicleRepository tripVehicles,
            TripHorseRepository tripHorses,
            TripJobRepository parts,
            CodeService codeService) {
        this.trips = trips;
        this.tripVehicles = tripVehicles;
        this.tripHorses = tripHorses;
        this.parts = parts;
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
        partOf(trip, job);
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

    /**
     * A trailer carrying only horses that leave a moving trip goes with them, with its load plan, onto their new trip
     * (US-F5-06). The caller moves its crew and booking.
     */
    @Transactional
    public TripVehicle moveVehicle(TripVehicle tripVehicle, Trip to) {
        List<TripVehicle> current = vehiclesOf(to);
        tripVehicle.setTrip(to);
        tripVehicle.setSeq(
                (short) (current.stream().mapToInt(TripVehicle::getSeq).max().orElse(0) + 1));
        return tripVehicles.save(tripVehicle);
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
        partOf(to, job);
        return moving.stream().map(th -> th.getHorse().getId()).toList();
    }

    /**
     * Moves some of a moving job's horses from {@code from} to {@code to} (US-F5-06, an incident decision). Their rows
     * on {@code from} stay as MOVED; the job then has a part on each trip until every horse is delivered.
     */
    @Transactional
    public void moveHorses(TransportJob job, Collection<UUID> horseIds, Trip from, Trip to) {
        List<TripHorse> moving =
                tripHorses.findByTrip_IdAndJob_IdAndStatus(from.getId(), job.getId(), TripHorseStatus.ON_TRIP).stream()
                        .filter(th -> horseIds.contains(th.getHorse().getId()))
                        .toList();
        // Off the trip first: a horse has one ON_TRIP row per job (trip_horses_job_id_horse_id_on_trip_idx).
        moving.forEach(leaving -> leaving.setStatus(TripHorseStatus.MOVED));
        tripHorses.saveAllAndFlush(moving);
        for (TripHorse leaving : moving) {
            TripHorse onTrip = new TripHorse();
            onTrip.setTrip(to);
            onTrip.setJob(job);
            onTrip.setHorse(leaving.getHorse());
            tripHorses.save(onTrip);
        }
        partOf(to, job);
    }

    /** Some of the job's horses stay at a vet clinic or a stable and won't travel on (US-F5-06). */
    @Transactional
    public void leaveInCare(Trip trip, TransportJob job, Collection<UUID> horseIds) {
        for (TripHorse onTrip :
                tripHorses.findByTrip_IdAndJob_IdAndStatus(trip.getId(), job.getId(), TripHorseStatus.ON_TRIP)) {
            if (horseIds.contains(onTrip.getHorse().getId())) onTrip.setStatus(TripHorseStatus.LEFT_IN_CARE);
        }
        tripHorses.flush();
    }

    /** The job's part on the trip, made when the job first rides it. */
    @Transactional
    public TripJob partOf(Trip trip, TransportJob job) {
        return parts.findByTrip_IdAndJob_Id(trip.getId(), job.getId()).orElseGet(() -> {
            TripJob part = new TripJob();
            part.setTrip(trip);
            part.setJob(job);
            return parts.save(part);
        });
    }

    /**
     * The job's parts for staff (US-F5-06): each trip it has horses on, with its status, horses and planned departure;
     * empty while the job is on one trip.
     */
    @Transactional(readOnly = true)
    public List<com.equifreight.model.trip.TripPartResponse> describeParts(TransportJob job) {
        List<com.equifreight.model.trip.TripPartResponse> described = new java.util.ArrayList<>();
        Optional<Trip> current = findTripOf(job.getId());
        for (TripJob part : parts.findByJob_IdOrderByCreatedAt(job.getId())) {
            List<TripHorse> onPart = tripHorses
                    .findByTrip_IdOrderByCreatedAt(part.getTrip().getId())
                    .stream()
                    .filter(th -> th.getJob().getId().equals(job.getId()) && th.getStatus() != TripHorseStatus.MOVED)
                    .toList();
            if (onPart.isEmpty()) continue;
            described.add(new com.equifreight.model.trip.TripPartResponse(
                    part.getTrip().getId(),
                    part.getTrip().getCode(),
                    part.getStatus(),
                    onPart.stream()
                            .filter(th -> th.getStatus() != TripHorseStatus.LEFT_IN_CARE)
                            .map(th -> th.getHorse().getName())
                            .toList(),
                    onPart.stream()
                            .filter(th -> th.getStatus() == TripHorseStatus.LEFT_IN_CARE)
                            .map(th -> th.getHorse().getName())
                            .toList(),
                    part.getTrip().getPlannedDepartureAt(),
                    null,
                    current.map(t -> t.getId().equals(part.getTrip().getId())).orElse(false)));
        }
        return described.size() > 1 ? described : List.of();
    }

    /** The job's parts that still have horses on their trip, oldest first: two while the job spans trips. */
    @Transactional(readOnly = true)
    public List<TripJob> activePartsOf(TransportJob job) {
        List<UUID> riding = tripHorses.findByJob_IdOrderByCreatedAt(job.getId()).stream()
                .filter(th -> th.getStatus() == TripHorseStatus.ON_TRIP)
                .map(th -> th.getTrip().getId())
                .distinct()
                .toList();
        return parts.findByJob_IdOrderByCreatedAt(job.getId()).stream()
                .filter(p -> riding.contains(p.getTrip().getId()))
                .toList();
    }

    /** Every part the job has had, oldest first, including those its horses moved off or were delivered on. */
    @Transactional(readOnly = true)
    public List<TripJob> partsOf(TransportJob job) {
        return parts.findByJob_IdOrderByCreatedAt(job.getId());
    }

    /** Whether the job's part on the trip has left (an unknown part counts as the job's own state). */
    @Transactional(readOnly = true)
    public boolean partDeparted(Trip trip, TransportJob job) {
        return parts.findByTrip_IdAndJob_Id(trip.getId(), job.getId())
                .map(TripJob::departed)
                .orElse(job.getDepartedAt() != null || job.getTripStatus() != TripStatus.NOT_STARTED);
    }

    /** Whether the job has a part still to leave: a job that departed can be planned again for that part. */
    @Transactional(readOnly = true)
    public boolean hasPartToLeave(TransportJob job) {
        return activePartsOf(job).stream().anyMatch(p -> !p.departed());
    }

    /** The manager's sign-off of the trip covers every job's part on it (US-F3-08). */
    @Transactional
    public void signOff(Trip trip, User by, Instant at) {
        for (TransportJob job : jobsOn(trip)) {
            TripJob part = partOf(trip, job);
            part.setSignedOffAt(at);
            part.setSignedOffBy(by);
            job.setSignedOffAt(at);
            job.setSignedOffBy(by);
        }
    }

    /** A change to the trip's plan needs a new sign-off for every job on it. */
    @Transactional
    public void clearSignOff(Trip trip) {
        for (TransportJob job : jobsOn(trip)) {
            parts.findByTrip_IdAndJob_Id(trip.getId(), job.getId()).ifPresent(p -> {
                p.setSignedOffAt(null);
                p.setSignedOffBy(null);
            });
            job.setSignedOffAt(null);
            job.setSignedOffBy(null);
        }
    }

    /**
     * The job's own status from its parts (US-F5-06): delivered when every horse is handed over or left in care;
     * otherwise held, moving or arrived as its most advanced part on the road, and moving while a part waits to
     * continue after another has left. Departure is its first part's; a single part is the job's status exactly.
     */
    @Transactional
    public void summarize(TransportJob job) {
        List<TripHorse> rows = tripHorses.findByJob_IdOrderByCreatedAt(job.getId()).stream()
                .filter(th -> th.getStatus() != TripHorseStatus.MOVED)
                .toList();
        List<TripJob> all = parts.findByJob_IdOrderByCreatedAt(job.getId());
        all.stream()
                .map(TripJob::getDepartedAt)
                .filter(java.util.Objects::nonNull)
                .min(Instant::compareTo)
                .ifPresent(job::setDepartedAt);
        boolean accounted = !rows.isEmpty()
                && rows.stream()
                        .allMatch(th -> th.getStatus() == TripHorseStatus.DELIVERED
                                || th.getStatus() == TripHorseStatus.LEFT_IN_CARE);
        if (accounted) {
            job.setTripStatus(TripStatus.DELIVERED);
            all.stream()
                    .map(TripJob::getDeliveredAt)
                    .filter(java.util.Objects::nonNull)
                    .max(Instant::compareTo)
                    .ifPresent(at -> {
                        if (job.getDeliveredAt() == null) job.setDeliveredAt(at);
                    });
            if (job.getStage() != JobStage.CLOSED) job.setStage(JobStage.HANDOVER);
            return;
        }
        List<TripStatus> active = activePartsOf(job).stream()
                .map(TripJob::getStatus)
                .filter(s -> s != TripStatus.DELIVERED)
                .toList();
        TripStatus summary = active.contains(TripStatus.HELD)
                ? TripStatus.HELD
                : active.contains(TripStatus.DEPARTED)
                        ? TripStatus.DEPARTED
                        : active.contains(TripStatus.ARRIVED) ? TripStatus.ARRIVED : TripStatus.NOT_STARTED;
        if (summary == TripStatus.NOT_STARTED && job.getDepartedAt() != null) summary = TripStatus.DEPARTED;
        job.setTripStatus(summary);
        // Delivered only once every horse is: a part delivered early doesn't deliver the job.
        job.setDeliveredAt(null);
        if (summary != TripStatus.NOT_STARTED && job.getStage() != JobStage.CLOSED) job.setStage(JobStage.TRIP);
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
