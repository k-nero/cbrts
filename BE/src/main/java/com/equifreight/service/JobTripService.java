package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
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
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The trip a job travels on (US-F3-09, docs/shared-trips-design.md). Every job is approved onto a trip of its own, so
 * a job that shares nothing is a trip with one job and one vehicle. A job can be planned as a chain of trips, each
 * handing its horses on to the next (US-F3-16, docs/multi-trip-jobs-design.md).
 */
@Service
public class JobTripService {

    /** The horses a trip carries: on it now, or planned on it as a later trip of their job's chain. */
    private static final Set<TripHorseStatus> CARRIED = EnumSet.of(TripHorseStatus.ON_TRIP, TripHorseStatus.PLANNED);

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
     * The trip a planning page is about: {@code tripId} when given, which must be one of the job's parts (a later trip
     * of its chain, say), else the job's current trip.
     */
    @Transactional(readOnly = true)
    public Trip tripOf(UUID jobId, UUID tripId) {
        if (tripId == null) return tripOf(jobId);
        return parts.findByTrip_IdAndJob_Id(tripId, jobId)
                .map(TripJob::getTrip)
                .orElseThrow(() -> ResourceNotFoundException.of("Trip of job", tripId));
    }

    /** As {@link #tripOf(UUID, UUID)}, empty when the job has no trip. */
    @Transactional(readOnly = true)
    public Optional<Trip> findTripOf(UUID jobId, UUID tripId) {
        if (tripId == null) return findTripOf(jobId);
        return parts.findByTrip_IdAndJob_Id(tripId, jobId).map(TripJob::getTrip);
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

    /**
     * The horses the trip carries, of every job on it, in the order they joined: those on it now, and those planned on
     * it as a later trip of their job's chain (US-F3-16), which its load plans and crew are made for.
     */
    @Transactional(readOnly = true)
    public List<TripHorse> horsesOn(Trip trip) {
        return tripHorses.findByTrip_IdAndStatusInOrderByCreatedAt(trip.getId(), CARRIED);
    }

    /** The horses planned on the trip that the trip before hasn't handed on yet (US-F3-16). */
    @Transactional(readOnly = true)
    public List<TripHorse> waitingFor(Trip trip) {
        return tripHorses.findByTrip_IdAndStatusOrderByCreatedAt(trip.getId(), TripHorseStatus.PLANNED);
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
        return newTrip(job.getRequest().getCorridor(), createdBy, at);
    }

    /** A new trip on {@code corridor}, with no horses yet: a later trip of a job's chain, say (US-F3-16). */
    @Transactional
    public Trip newTrip(Corridor corridor, User createdBy, Instant at) {
        Trip trip = new Trip();
        trip.setCode(
                codeService.next(CodePrefix.TRP, at.atZone(BusinessTime.ZONE).getYear()));
        trip.setCorridor(corridor);
        trip.setCreatedBy(createdBy);
        return trips.save(trip);
    }

    /**
     * Moves the job's horses from {@code from} to {@code to} before departure (US-F3-11). Their rows on {@code from}
     * stay as MOVED, so history shows where they were; a horse that rode {@code to} before is put back on it. Horses
     * planned on {@code from} as a later trip of their chain (US-F3-16) stay planned on {@code to}, and the chain
     * follows: the part before hands on to the job's part on {@code to}, which hands on where {@code from}'s did.
     */
    @Transactional
    public List<UUID> moveJob(TransportJob job, Trip from, Trip to) {
        List<TripHorse> moving = tripHorses.findByTrip_IdAndJob_IdAndStatusIn(from.getId(), job.getId(), CARRIED);
        Map<UUID, TripHorseStatus> was = new HashMap<>();
        for (TripHorse onTrip : moving) {
            was.put(onTrip.getHorse().getId(), onTrip.getStatus());
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
            onTrip.setStatus(was.get(moved.getHorse().getId()));
            tripHorses.save(onTrip);
        }
        tripHorses.flush();
        TripJob part = partOf(to, job);
        parts.findByTrip_IdAndJob_Id(from.getId(), job.getId()).ifPresent(old -> relink(old, part));
        return moving.stream().map(th -> th.getHorse().getId()).toList();
    }

    /** {@code part} takes {@code old}'s place in the job's chain (US-F3-16): it hands on, and is handed on to, as old was. */
    private void relink(TripJob old, TripJob part) {
        if (old.getId().equals(part.getId())) return;
        List<TripJob> before = parts.findByNext_IdOrderByCreatedAt(old.getId());
        TripJob after = old.getNext();
        if (before.isEmpty() && after == null) return;
        old.setNext(null);
        parts.saveAndFlush(old);
        for (TripJob b : before) {
            b.setNext(part);
            parts.saveAndFlush(b);
        }
        if (after != null && part.getNext() == null) {
            part.setNext(after);
            parts.saveAndFlush(part);
        }
    }

    /**
     * Plans the job's horses on {@code from} onto {@code to}, the next trip of its chain (US-F3-16): they ride
     * {@code to} as PLANNED until {@code from} hands them on, and the job's part on {@code from} continues as its part
     * on {@code to}, which continues where {@code from}'s did.
     */
    @Transactional
    public TripJob planNext(TransportJob job, Trip from, Trip to) {
        TripJob part = partOf(from, job);
        TripJob next = partOf(to, job);
        List<TripHorse> carried = tripHorses.findByTrip_IdAndJob_IdAndStatusIn(from.getId(), job.getId(), CARRIED);
        if (carried.isEmpty()) {
            throw new BusinessException(job.getCode() + " has no horse on trip " + from.getCode());
        }
        Set<UUID> already = new HashSet<>();
        tripHorses.findByTrip_IdOrderByCreatedAt(to.getId()).stream()
                .filter(th -> th.getJob().getId().equals(job.getId()))
                .forEach(th -> already.add(th.getHorse().getId()));
        for (TripHorse riding : carried) {
            if (!already.add(riding.getHorse().getId())) continue;
            TripHorse planned = new TripHorse();
            planned.setTrip(to);
            planned.setJob(job);
            planned.setHorse(riding.getHorse());
            planned.setStatus(TripHorseStatus.PLANNED);
            tripHorses.save(planned);
        }
        tripHorses.flush();
        TripJob after = part.getNext();
        part.setNext(null);
        parts.saveAndFlush(part);
        next.setNext(after);
        parts.saveAndFlush(next);
        part.setNext(next);
        return parts.saveAndFlush(part);
    }

    /**
     * Takes the job off {@code trip}, a later trip of its chain not yet handed on to (US-F3-16): its planned horses and
     * its part there go, and the part before hands on where this one did. Returns the part before.
     */
    @Transactional
    public TripJob unplan(TransportJob job, Trip trip) {
        TripJob part = parts.findByTrip_IdAndJob_Id(trip.getId(), job.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("Trip of job", trip.getId()));
        List<TripJob> handingOn = parts.findByNext_IdOrderByCreatedAt(part.getId());
        if (handingOn.isEmpty()) {
            throw new BusinessException(
                    "Trip " + trip.getCode() + " isn't a later trip of " + job.getCode() + "'s journey");
        }
        List<TripHorse> rows = tripHorses.findByTrip_IdOrderByCreatedAt(trip.getId()).stream()
                .filter(th -> th.getJob().getId().equals(job.getId()))
                .toList();
        if (rows.stream().anyMatch(th -> th.getStatus() != TripHorseStatus.PLANNED)) {
            throw new BusinessException(job.getCode() + "'s horses are already on trip " + trip.getCode());
        }
        TripJob after = part.getNext();
        for (TripJob before : handingOn) {
            before.setNext(null);
            parts.saveAndFlush(before);
        }
        part.setNext(null);
        parts.saveAndFlush(part);
        tripHorses.deleteAll(rows);
        parts.delete(part);
        parts.flush();
        for (TripJob before : handingOn) {
            before.setNext(after);
            parts.saveAndFlush(before);
        }
        return handingOn.getFirst();
    }

    /**
     * The job's horses leave {@code trip} for the next trip of its chain (US-F3-16): HANDED_ON here, ON_TRIP there.
     * Returns the next trip, or empty when the job's part on {@code trip} is the last of its chain.
     */
    @Transactional
    public Optional<Trip> handOn(Trip trip, TransportJob job) {
        TripJob part = partOf(trip, job);
        if (part.getNext() == null) return Optional.empty();
        Trip next = part.getNext().getTrip();
        List<TripHorse> leaving =
                tripHorses.findByTrip_IdAndJob_IdAndStatus(trip.getId(), job.getId(), TripHorseStatus.ON_TRIP);
        Set<UUID> ids = new HashSet<>();
        for (TripHorse onTrip : leaving) {
            onTrip.setStatus(TripHorseStatus.HANDED_ON);
            ids.add(onTrip.getHorse().getId());
        }
        // Off this trip first: a horse has one ON_TRIP row per job (trip_horses_job_id_horse_id_on_trip_idx).
        tripHorses.saveAllAndFlush(leaving);
        for (TripHorse waiting :
                tripHorses.findByTrip_IdAndJob_IdAndStatus(next.getId(), job.getId(), TripHorseStatus.PLANNED)) {
            if (ids.contains(waiting.getHorse().getId())) waiting.setStatus(TripHorseStatus.ON_TRIP);
        }
        tripHorses.flush();
        return Optional.of(next);
    }

    /** Whether the job's part on {@code trip} hands its horses on to a later trip of its chain (US-F3-16). */
    @Transactional(readOnly = true)
    public boolean handsOn(Trip trip, TransportJob job) {
        return parts.findByTrip_IdAndJob_Id(trip.getId(), job.getId())
                .map(p -> p.getNext() != null)
                .orElse(false);
    }

    /**
     * A part of the job that hands on to its part on {@code trip}, the first made when an incident left two; empty for
     * the first trip of its journey.
     */
    @Transactional(readOnly = true)
    public Optional<TripJob> partBefore(Trip trip, TransportJob job) {
        return partsBefore(trip, job).stream().findFirst();
    }

    /** Every part of the job that hands on to its part on {@code trip}, oldest first; two after an incident split. */
    @Transactional(readOnly = true)
    public List<TripJob> partsBefore(Trip trip, TransportJob job) {
        return parts.findByTrip_IdAndJob_Id(trip.getId(), job.getId())
                .map(p -> parts.findByNext_IdOrderByCreatedAt(p.getId()))
                .orElse(List.of());
    }

    /**
     * The trip of the job's journey that carries the clearance gate (US-F2-13): the first one that crosses a border,
     * or the journey's first trip when none does, as on a domestic move. A trip before it is a domestic leg into the
     * city the move leaves the country from, and departs without the cleared dossier. Empty while the job has no trip.
     */
    @Transactional(readOnly = true)
    public Optional<Trip> borderTripOf(TransportJob job) {
        List<TripJob> journey = journeyOf(job);
        return journey.stream()
                .map(TripJob::getTrip)
                .filter(t -> t.getCorridor().crossesBorder())
                .findFirst()
                .or(() -> journey.stream().findFirst().map(TripJob::getTrip));
    }

    /**
     * Whether the job's part on {@code trip} comes before the border (US-F2-13): the trip stays in one country and a
     * later trip of its chain crosses a border. Such a trip departs before the dossier is cleared.
     */
    @Transactional(readOnly = true)
    public boolean beforeBorder(Trip trip, TransportJob job) {
        if (trip.getCorridor() == null || trip.getCorridor().crossesBorder()) return false;
        return beforeBorderTrips(parts.findByJob_IdOrderByCreatedAt(job.getId()))
                .contains(trip.getId());
    }

    /** The trips among a job's parts that stay in one country and hand on, somewhere down the chain, to one that doesn't. */
    private static Set<UUID> beforeBorderTrips(List<TripJob> all) {
        if (all.stream().noneMatch(JobTripService::crosses)) return Set.of();
        Map<UUID, TripJob> byId =
                all.stream().filter(p -> p.getId() != null).collect(Collectors.toMap(TripJob::getId, p -> p));
        Set<UUID> trips = new HashSet<>();
        for (TripJob part : all) {
            if (crosses(part)) continue;
            int hops = 0;
            for (TripJob p = nextOf(part, byId); p != null && hops++ < all.size(); p = nextOf(p, byId)) {
                if (crosses(p)) {
                    trips.add(part.getTrip().getId());
                    break;
                }
            }
        }
        return trips;
    }

    private static boolean crosses(TripJob part) {
        return part.getTrip().getCorridor() != null
                && part.getTrip().getCorridor().crossesBorder();
    }

    /**
     * The departure a job's documents are checked against (US-F2-13): the planned departure of the trip that crosses
     * the border when a domestic leg comes first, since the export checks happen where the move leaves the country.
     * Otherwise, and until that trip's route is confirmed, the job's own planned departure.
     */
    @Transactional(readOnly = true)
    public Instant documentsDepartureOf(TransportJob job) {
        List<TripJob> journey = journeyOf(job);
        for (int i = 1; i < journey.size(); i++) {
            Trip trip = journey.get(i).getTrip();
            if (journey.get(0).getTrip().getCorridor().crossesBorder()) break;
            if (trip.getCorridor().crossesBorder())
                return trip.getPlannedDepartureAt() != null
                        ? trip.getPlannedDepartureAt()
                        : job.getPlannedDepartureAt();
        }
        return job.getPlannedDepartureAt();
    }

    /** The job's parts in journey order, from its first trip along the chain; one query for the parts. */
    private List<TripJob> journeyOf(TransportJob job) {
        List<TripJob> all = parts.findByJob_IdOrderByCreatedAt(job.getId());
        Map<UUID, TripJob> byId =
                all.stream().filter(p -> p.getId() != null).collect(Collectors.toMap(TripJob::getId, p -> p));
        Set<UUID> handedOnTo = all.stream()
                .map(p -> p.getNext() == null ? null : p.getNext().getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<TripJob> journey = new ArrayList<>();
        TripJob p = all.stream()
                .filter(x -> !handedOnTo.contains(x.getId()))
                .findFirst()
                .orElse(null);
        // A chain never loops; the bound only guards against bad data.
        while (p != null && journey.size() < all.size()) {
            journey.add(p);
            p = nextOf(p, byId);
        }
        return journey;
    }

    private static TripJob nextOf(TripJob part, Map<UUID, TripJob> byId) {
        return part.getNext() == null ? null : byId.get(part.getNext().getId());
    }

    /** The job's part on the next trip of its chain after {@code trip}; empty on the last trip of its journey. */
    @Transactional(readOnly = true)
    public Optional<TripJob> partAfter(Trip trip, TransportJob job) {
        return parts.findByTrip_IdAndJob_Id(trip.getId(), job.getId()).map(TripJob::getNext);
    }

    /**
     * Moves some of a moving job's horses from {@code from} to {@code to} (US-F5-06, an incident decision). Their rows
     * on {@code from} stay as MOVED; the job then has a part on each trip until every horse is delivered.
     */
    @Transactional
    public void moveHorses(TransportJob job, Collection<UUID> horseIds, Trip from, Trip to) {
        moveHorses(job, horseIds, from, to, true);
    }

    /**
     * As above; {@code staysOnJourney} is false when the horses leave the job's journey (returned to their origin), so
     * their new trip doesn't hand them on to the next trip of the chain (US-F3-16).
     */
    @Transactional
    public void moveHorses(TransportJob job, Collection<UUID> horseIds, Trip from, Trip to, boolean staysOnJourney) {
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
        TripJob part = partOf(to, job);
        // On a journey of several trips, the moved horses still go on to the next one (US-F3-16).
        TripJob next = parts.findByTrip_IdAndJob_Id(from.getId(), job.getId())
                .map(TripJob::getNext)
                .orElse(null);
        if (staysOnJourney && next != null && part.getNext() == null) {
            part.setNext(next);
            parts.saveAndFlush(part);
        }
    }

    /**
     * Horses that leave the job's journey on {@code trip} (left in care, or returned to their origin) come off its later
     * trips (US-F3-16): their planned rows there go, and a later trip with none of the job's horses left drops out of
     * the chain. Returns the later trips touched, oldest first, so the caller frees their stalls and plans.
     */
    @Transactional
    public List<Trip> withdrawFromJourney(Trip trip, TransportJob job, Collection<UUID> horseIds) {
        List<Trip> touched = new ArrayList<>();
        TripJob next = parts.findByTrip_IdAndJob_Id(trip.getId(), job.getId())
                .map(TripJob::getNext)
                .orElse(null);
        Set<UUID> seen = new HashSet<>();
        while (next != null && seen.add(next.getId())) {
            Trip later = next.getTrip();
            List<TripHorse> rows = tripHorses.findByTrip_IdOrderByCreatedAt(later.getId()).stream()
                    .filter(th -> th.getJob().getId().equals(job.getId()))
                    .toList();
            List<TripHorse> gone = rows.stream()
                    .filter(th -> th.getStatus() == TripHorseStatus.PLANNED
                            && horseIds.contains(th.getHorse().getId()))
                    .toList();
            TripJob after = next.getNext();
            if (!gone.isEmpty()) {
                touched.add(later);
                tripHorses.deleteAll(gone);
                tripHorses.flush();
                if (gone.size() == rows.size()) {
                    // None of the job's horses go this far any more: the part drops out of the chain.
                    for (TripJob before : parts.findByNext_IdOrderByCreatedAt(next.getId())) {
                        before.setNext(after);
                        parts.saveAndFlush(before);
                    }
                    next.setNext(null);
                    parts.saveAndFlush(next);
                    parts.delete(next);
                    parts.flush();
                }
            }
            next = after;
        }
        return touched;
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
     * The job's trips for staff (US-F5-06, US-F3-16): each trip it has horses on, with its status, horses and planned
     * departure, in journey order. A job on one trip has one; the job page lists them in its journey rail.
     */
    @Transactional(readOnly = true)
    public List<com.equifreight.model.trip.TripPartResponse> describeParts(TransportJob job) {
        return describeParts(job, null);
    }

    /** As above, with the part on {@code tripId} as the one shown; the job's current trip when null (US-F3-16). */
    @Transactional(readOnly = true)
    public List<com.equifreight.model.trip.TripPartResponse> describeParts(TransportJob job, UUID tripId) {
        List<com.equifreight.model.trip.TripPartResponse> described = new java.util.ArrayList<>();
        Optional<Trip> current = findTripOf(job.getId(), tripId);
        for (TripJob part : partsOf(job)) {
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
                    current.map(t -> t.getId().equals(part.getTrip().getId())).orElse(false),
                    Optional.ofNullable(part.getTrip().getCorridor())
                            .map(c -> c.getCode())
                            .orElse(null),
                    Optional.ofNullable(part.getTrip().getCorridor())
                            .map(c -> c.getMode())
                            .orElse(null),
                    part.getNext() != null));
        }
        return described;
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

    /**
     * Every part the job has had, including those its horses moved off or were delivered on: oldest first, and a chain
     * in its order, each part followed by the one it hands on to (US-F3-16).
     */
    @Transactional(readOnly = true)
    public List<TripJob> partsOf(TransportJob job) {
        List<TripJob> all = parts.findByJob_IdOrderByCreatedAt(job.getId());
        Set<UUID> handedTo = new HashSet<>();
        all.stream()
                .filter(p -> p.getNext() != null)
                .forEach(p -> handedTo.add(p.getNext().getId()));
        List<TripJob> ordered = new ArrayList<>();
        Set<UUID> seen = new HashSet<>();
        for (TripJob first : all) {
            if (handedTo.contains(first.getId())) continue;
            for (TripJob p = first; p != null && seen.add(p.getId()); p = p.getNext()) ordered.add(p);
        }
        // A part in a loop can't happen (each part hands on once, never to itself); keep any the walk missed.
        all.stream().filter(p -> !seen.contains(p.getId())).forEach(ordered::add);
        return ordered;
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
        // A horse moved by an incident, or handed on to the next trip of its chain, is accounted for on its new trip.
        List<TripHorse> rows = tripHorses.findByJob_IdOrderByCreatedAt(job.getId()).stream()
                .filter(th -> th.getStatus() != TripHorseStatus.MOVED && th.getStatus() != TripHorseStatus.HANDED_ON)
                .toList();
        List<TripJob> all = parts.findByJob_IdOrderByCreatedAt(job.getId());
        // A domestic leg before the border doesn't depart the job (US-F2-13).
        Set<UUID> domesticLegs = beforeBorderTrips(all);
        all.stream()
                .filter(p -> !domesticLegs.contains(p.getTrip().getId()))
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
        boolean pastBorder = activePartsOf(job).stream()
                        .anyMatch(p -> !domesticLegs.contains(p.getTrip().getId()))
                || job.getDepartedAt() != null;
        if (summary != TripStatus.NOT_STARTED && pastBorder && job.getStage() != JobStage.CLOSED)
            job.setStage(JobStage.TRIP);
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
