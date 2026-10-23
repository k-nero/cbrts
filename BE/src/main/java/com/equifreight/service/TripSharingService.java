package com.equifreight.service;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.JobMapper;
import com.equifreight.model.job.ShareTripResponse;
import com.equifreight.model.job.TripJobResponse;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.VehicleBookingRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sharing a trailer between jobs (US-F3-11, docs/shared-trips-design.md): the coordinator puts an approved job on
 * another job's trip, or takes one off it, before departure. Only jobs whose customer chose a shared trailer can be
 * combined, on the same corridor, with a departure day every job allows and room on the trailers. Prices,
 * quotations and invoices don't change. Every change reopens the trips it touches.
 */
@Service
@Log4j2
public class TripSharingService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);

    private final TransportJobRepository jobs;
    private final JobTripService jobTrips;
    private final LoadPlanService loadPlans;
    private final RoutePlanService routePlans;
    private final VehicleBookingRepository bookings;
    private final CrewAssignmentRepository crew;
    private final AuditService audit;
    private final Clock clock;

    public TripSharingService(
            TransportJobRepository jobs,
            JobTripService jobTrips,
            LoadPlanService loadPlans,
            RoutePlanService routePlans,
            VehicleBookingRepository bookings,
            CrewAssignmentRepository crew,
            AuditService audit,
            Clock clock) {
        this.jobs = jobs;
        this.jobTrips = jobTrips;
        this.loadPlans = loadPlans;
        this.routePlans = routePlans;
        this.bookings = bookings;
        this.crew = crew;
        this.audit = audit;
        this.clock = clock;
    }

    /** The days a job may leave: its departure date, moved by up to its flex days either way. */
    private record Days(LocalDate from, LocalDate to) {
        static Days of(TransportJob job) {
            TransportRequest request = job.getRequest();
            LocalDate date = request.getDepartureDate();
            return new Days(date.minusDays(request.getDateFlexDays()), date.plusDays(request.getDateFlexDays()));
        }

        Days and(Days other) {
            return new Days(from.isAfter(other.from) ? from : other.from, to.isBefore(other.to) ? to : other.to);
        }

        boolean isEmpty() {
            return from.isAfter(to);
        }

        @Override
        public String toString() {
            return from.equals(to)
                    ? "on " + from.format(DAY)
                    : "between " + from.format(DAY) + " and " + to.format(DAY);
        }
    }

    private TransportJob job(UUID jobId) {
        return jobs.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));
    }

    private static boolean departed(TransportJob job) {
        return job.getDepartedAt() != null || job.getTripStatus() != TripStatus.NOT_STARTED;
    }

    private static void requireShared(TransportJob job) {
        if (job.getRequest().getTrailer() != TrailerType.SHARED) {
            throw new BusinessException(job.getCode() + "'s customer booked a private trailer, so it travels alone");
        }
    }

    /**
     * Jobs that could join {@code jobId}'s trip: on its corridor, not departed, a shared trailer, not on the trip
     * yet. The checks run when one is added.
     */
    @Transactional(readOnly = true)
    public List<TripJobResponse> candidates(UUID jobId) {
        Trip trip = jobTrips.tripOf(jobId);
        List<UUID> onTrip =
                jobTrips.jobsOn(trip).stream().map(TransportJob::getId).toList();
        return jobs.findShareCandidates(trip.getCorridor().getId()).stream()
                .filter(j -> !onTrip.contains(j.getId()))
                .map(JobMapper::toTripJobResponse)
                .toList();
    }

    /**
     * Puts {@code joiningJobId} on {@code hostJobId}'s trip, with all its horses. Refused when a customer booked a
     * private trailer, on another corridor, when no departure day suits every job (naming whose dates rule it out),
     * or when the trailers lack room (add a trailer first, US-F3-10). The trip it leaves and the trip it joins
     * reopen: load plans back to draft, the route superseded by a draft with the job's pickup and delivery, and the
     * sign-off cleared.
     */
    @Transactional
    public ShareTripResponse share(UUID hostJobId, UUID joiningJobId, User currentUser) {
        TransportJob host = job(hostJobId);
        TransportJob joining = job(joiningJobId);
        Trip trip = jobTrips.tripOf(hostJobId);
        Trip from = jobTrips.tripOf(joiningJobId);
        if (from.getId().equals(trip.getId())) {
            throw new BusinessException(joining.getCode() + " is already on trip " + trip.getCode());
        }
        List<TransportJob> onTrip = jobTrips.jobsOn(trip);
        if (onTrip.isEmpty()) onTrip = List.of(host);
        for (TransportJob j : onTrip) {
            if (departed(j)) throw new BusinessException("Trip " + trip.getCode() + " has departed");
        }
        if (departed(joining)) throw new BusinessException(joining.getCode() + " has departed");

        for (TransportJob j : onTrip) requireShared(j);
        requireShared(joining);

        if (joining.getRequest().getCorridor() == null
                || !joining.getRequest()
                        .getCorridor()
                        .getId()
                        .equals(trip.getCorridor().getId())) {
            throw new BusinessException(joining.getCode() + " travels on another corridor than trip " + trip.getCode());
        }

        // One departure day inside every job's allowed days.
        Days days = Days.of(joining);
        for (TransportJob j : onTrip) {
            Days together = days.and(Days.of(j));
            if (together.isEmpty()) {
                throw new ConflictException(
                        "DATES_DONT_FIT",
                        joining.getCode() + " can leave " + Days.of(joining) + " and " + j.getCode() + " " + Days.of(j)
                                + ": no departure day suits both");
            }
            days = together;
        }

        // One horse can't ride the trip twice, booked on both jobs (an outbound and a return, say).
        List<TripHorse> riding = jobTrips.horsesOn(trip);
        for (TripHorse mine : jobTrips.horsesOn(from)) {
            if (!mine.getJob().getId().equals(joining.getId())) continue;
            riding.stream()
                    .filter(th -> th.getHorse().getId().equals(mine.getHorse().getId()))
                    .findFirst()
                    .ifPresent(th -> {
                        throw new BusinessException(mine.getHorse().getName() + " is already on trip "
                                + trip.getCode() + " under " + th.getJob().getCode()
                                + "; a horse can't travel twice on one trip");
                    });
        }

        String noRoom = loadPlans.lackOfRoom(trip, joining);
        if (noRoom != null) {
            throw new ConflictException(
                    "NEEDS_ANOTHER_TRAILER",
                    "Not enough room on trip " + trip.getCode() + " for " + joining.getCode() + ": " + noRoom
                            + ". Add a trailer on the Load plan tab first.");
        }

        List<UUID> horses = jobTrips.horsesOn(from).stream()
                .filter(th -> th.getJob().getId().equals(joining.getId()))
                .map(th -> th.getHorse().getId())
                .toList();
        loadPlans.unload(from, horses);
        jobTrips.moveJob(joining, from, trip);
        leaveBehind(from, joining, joining.getCode() + " moved to trip " + trip.getCode());

        String reason = joining.getCode() + " joined the trip";
        loadPlans.reopenTrip(trip, reason);
        routePlans.addJobStops(trip, joining);
        joining.setSignedOffAt(null);
        joining.setSignedOffBy(null);

        audit.recordDecision(
                currentUser,
                "SHARE_TRIP",
                AuditText.fit(joining.getCode() + " put on trip " + trip.getCode() + " with " + host.getCode()
                        + "; departure " + days),
                "TRIP",
                trip.getId(),
                trip.getCode(),
                null,
                from.getCode(),
                trip.getCode());
        log.info("{} joined trip {}", joining.getCode(), trip.getCode());

        List<TripJobResponse> now = new ArrayList<>(
                onTrip.stream().map(JobMapper::toTripJobResponse).toList());
        now.add(JobMapper.toTripJobResponse(joining));
        return ShareTripResponse.builder()
                .tripCode(trip.getCode())
                .departFrom(days.from())
                .departTo(days.to())
                .jobs(now)
                .build();
    }

    /**
     * Takes {@code leavingJobId} off {@code hostJobId}'s trip before departure, onto a new trip of its own: never onto
     * none. The trip it leaves reopens without its pickup and delivery, so the others can be planned and leave.
     */
    @Transactional
    public TripJobResponse takeOff(UUID hostJobId, UUID leavingJobId, User currentUser) {
        job(hostJobId);
        TransportJob leaving = job(leavingJobId);
        Trip trip = jobTrips.tripOf(hostJobId);
        List<TransportJob> onTrip = jobTrips.jobsOn(trip);
        if (onTrip.stream().noneMatch(j -> j.getId().equals(leavingJobId))) {
            throw new BusinessException(leaving.getCode() + " is not on trip " + trip.getCode());
        }
        if (onTrip.size() < 2) {
            throw new BusinessException(leaving.getCode() + " already travels alone on trip " + trip.getCode());
        }
        for (TransportJob j : onTrip) {
            if (departed(j)) {
                throw new BusinessException("Trip " + trip.getCode()
                        + " has departed: a job leaves a moving trip only through an incident");
            }
        }

        List<UUID> horses = jobTrips.horsesOn(trip).stream()
                .filter(th -> th.getJob().getId().equals(leavingJobId))
                .map(th -> th.getHorse().getId())
                .toList();
        loadPlans.unload(trip, horses);
        Trip own = jobTrips.newTripFor(leaving, currentUser, clock.instant());
        jobTrips.moveJob(leaving, trip, own);
        leaveBehind(trip, leaving, leaving.getCode() + " taken off the trip");
        leaving.setSignedOffAt(null);
        leaving.setSignedOffBy(null);

        audit.recordDecision(
                currentUser,
                "UNSHARE_TRIP",
                AuditText.fit(leaving.getCode() + " taken off trip " + trip.getCode() + " onto its own trip "
                        + own.getCode()),
                "TRIP",
                trip.getId(),
                trip.getCode(),
                null,
                trip.getCode(),
                own.getCode());
        log.info("{} taken off trip {} onto {}", leaving.getCode(), trip.getCode(), own.getCode());
        return JobMapper.toTripJobResponse(leaving);
    }

    /**
     * The trip {@code job} just left: when nobody rides it any more, its trailers' bookings and crew are released;
     * otherwise it reopens without the job's stops.
     */
    private void leaveBehind(Trip trip, TransportJob job, String reason) {
        if (jobTrips.jobsOn(trip).isEmpty()) {
            bookings.deleteAll(bookings.findByTrip_Id(trip.getId()));
            jobTrips.vehiclesOf(trip).forEach(tv -> crew.deleteByTripVehicleId(tv.getId()));
            return;
        }
        loadPlans.reopenTrip(trip, reason);
        routePlans.removeJobStops(trip, job);
    }
}
