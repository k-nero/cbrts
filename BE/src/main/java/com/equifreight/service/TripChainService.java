package com.equifreight.service;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.Place;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.User;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.trip.TripPartResponse;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.VehicleBookingRepository;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A job planned as a chain of trips (US-F3-16, docs/multi-trip-jobs-design.md): trailers to the departure airport, the
 * flight, other trailers after release, each a trip of its own with its own corridor, carrier, dates, crew and
 * bookings. The fleet coordinator splits the journey at an airport or quarantine stop, before the trip departs; the
 * quotation and invoices don't change.
 */
@Log4j2
@Service
public class TripChainService {

    private final TransportJobRepository jobs;
    private final CorridorRepository corridors;
    private final JobTripService jobTrips;
    private final RoutePlanService routePlans;
    private final LoadPlanService loadPlans;
    private final FlightService flights;
    private final VehicleBookingRepository bookings;
    private final CrewAssignmentRepository crew;
    private final AuditService audit;
    private final Clock clock;

    public TripChainService(
            TransportJobRepository jobs,
            CorridorRepository corridors,
            JobTripService jobTrips,
            RoutePlanService routePlans,
            LoadPlanService loadPlans,
            FlightService flights,
            VehicleBookingRepository bookings,
            CrewAssignmentRepository crew,
            AuditService audit,
            Clock clock) {
        this.jobs = jobs;
        this.corridors = corridors;
        this.jobTrips = jobTrips;
        this.routePlans = routePlans;
        this.loadPlans = loadPlans;
        this.flights = flights;
        this.bookings = bookings;
        this.crew = crew;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * Continues {@code jobId}'s journey on a new trip of {@code corridorId}, from the stop numbered {@code stopSeq} on
     * the route of its trip {@code tripId} (its current trip when null). The stop becomes the job's transfer, the
     * job's stops after it move to the new trip's draft route, and its horses are planned on the new trip until the
     * trip before hands them on. The trip before reopens: its load plans back to draft and its sign-off cleared.
     */
    @Transactional
    public List<TripPartResponse> continueOn(UUID jobId, UUID tripId, short stopSeq, UUID corridorId, User user) {
        TransportJob job = job(jobId);
        Trip from = jobTrips.tripOf(jobId, tripId);
        if (jobTrips.partDeparted(from, job)) {
            throw new BusinessException("Trip " + from.getCode() + " has departed: plan the rest of " + job.getCode()
                    + "'s journey before it leaves");
        }
        Corridor corridor =
                corridors.findById(corridorId).orElseThrow(() -> ResourceNotFoundException.of("Corridor", corridorId));
        Trip to = jobTrips.newTrip(corridor, user, clock.instant());
        String reason = job.getCode() + " continues on trip " + to.getCode();
        loadPlans.reopenTrip(from, reason);
        jobTrips.planNext(job, from, to);
        Place at = routePlans.splitAt(from, to, job, stopSeq, reason);
        flights.allocate(from);
        flights.allocate(to);

        audit.recordDecision(
                user,
                "CONTINUE_ON_TRIP",
                AuditText.fit(job.getCode() + " continues from " + at.getName() + " on trip " + to.getCode() + " ("
                        + corridor.getCode() + ") after trip " + from.getCode()),
                "TRIP",
                to.getId(),
                to.getCode(),
                null,
                from.getCode(),
                to.getCode());
        log.info("{} continues on trip {} after {}", job.getCode(), to.getCode(), from.getCode());
        return jobTrips.describeParts(job);
    }

    /**
     * Takes trip {@code tripId} out of {@code jobId}'s chain, before either it or the trip before departs: the job's
     * stops on it go back after its transfer on the trip before, which turns back into the airport or quarantine stop
     * it was. A trip nobody rides any more releases its trailers' bookings and crew; one shared with other jobs
     * reopens without the job.
     */
    @Transactional
    public List<TripPartResponse> remove(UUID jobId, UUID tripId, User user) {
        TransportJob job = job(jobId);
        Trip next = jobTrips.tripOf(jobId, tripId);
        TripJob before = jobTrips.partBefore(next, job)
                .orElseThrow(() -> new BusinessException(
                        "Trip " + next.getCode() + " is the first trip of " + job.getCode() + "'s journey"));
        Trip from = before.getTrip();
        if (jobTrips.partDeparted(from, job) || jobTrips.partDeparted(next, job)) {
            throw new BusinessException("Trip " + from.getCode()
                    + " has departed: the trips of a journey are joined back only before it leaves");
        }
        boolean others = jobTrips.jobsOn(next).stream().anyMatch(j -> !j.getId().equals(job.getId()));
        String reason = "Trip " + next.getCode() + " taken out of " + job.getCode() + "'s journey";
        List<UUID> planned = jobTrips.horsesOn(next).stream()
                .filter(th -> th.getJob().getId().equals(job.getId()))
                .map(TripHorse::getHorse)
                .map(h -> h.getId())
                .toList();
        loadPlans.unload(next, planned);
        loadPlans.reopenTrip(from, reason);
        if (others) loadPlans.reopenTrip(next, reason);
        routePlans.joinBack(from, next, job, others, reason);
        jobTrips.unplan(job, next);
        flights.allocate(from);
        if (others) {
            flights.allocate(next);
        } else {
            bookings.deleteAll(bookings.findByTrip_Id(next.getId()));
            crew.deleteByTripId(next.getId());
        }

        audit.recordDecision(
                user,
                "REMOVE_CHAINED_TRIP",
                AuditText.fit(reason + "; it travels on trip " + from.getCode() + " again"),
                "TRIP",
                next.getId(),
                next.getCode(),
                null,
                next.getCode(),
                from.getCode());
        log.info("{} no longer continues on trip {}", job.getCode(), next.getCode());
        return jobTrips.describeParts(job);
    }

    private TransportJob job(UUID jobId) {
        return jobs.findById(jobId).orElseThrow(() -> ResourceNotFoundException.of("Job", jobId));
    }
}
