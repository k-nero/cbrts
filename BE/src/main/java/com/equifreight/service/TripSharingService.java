package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.BiosecurityWarningResponse;
import com.equifreight.model.job.JobMapper;
import com.equifreight.model.job.JoinableTripResponse;
import com.equifreight.model.job.ShareSuggestionResponse;
import com.equifreight.model.job.ShareTripResponse;
import com.equifreight.model.job.TripJobResponse;
import com.equifreight.repository.ChecklistItemRepository;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TripRepository;
import com.equifreight.repository.VehicleBookingRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
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
    private final BiosecurityService biosecurity;
    private final TripNotices notices;
    private final FlightService flights;
    private final TripRepository trips;
    private final ChecklistItemRepository checklist;
    private final Clock clock;

    public TripSharingService(
            TransportJobRepository jobs,
            JobTripService jobTrips,
            LoadPlanService loadPlans,
            RoutePlanService routePlans,
            VehicleBookingRepository bookings,
            CrewAssignmentRepository crew,
            AuditService audit,
            BiosecurityService biosecurity,
            TripNotices notices,
            FlightService flights,
            TripRepository trips,
            ChecklistItemRepository checklist,
            Clock clock) {
        this.jobs = jobs;
        this.jobTrips = jobTrips;
        this.loadPlans = loadPlans;
        this.routePlans = routePlans;
        this.bookings = bookings;
        this.crew = crew;
        this.audit = audit;
        this.biosecurity = biosecurity;
        this.notices = notices;
        this.flights = flights;
        this.trips = trips;
        this.checklist = checklist;
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

    /** Whether the job's part on {@code trip} has left: after that, only an incident moves it (US-F5-06). */
    private boolean departed(TransportJob job, Trip trip) {
        return jobTrips.partDeparted(trip, job);
    }

    private static void requireShared(TransportJob job) {
        if (job.getRequest().getTrailer() != TrailerType.SHARED) {
            throw new BusinessException(job.getCode() + "'s customer booked a private trailer, so it travels alone");
        }
    }

    /**
     * Jobs that could share {@code jobId}'s trailer (US-F3-13): approved, not departed, on its corridor with a shared
     * trailer, and passing every check of joining it (a common departure day, room on the trailers, no horse on both
     * jobs). Each comes with the proposed departure, the horses it adds, the stalls left and its biosecurity
     * warnings. A trip that has departed suggests nothing.
     */
    @Transactional(readOnly = true)
    public List<ShareSuggestionResponse> suggestions(UUID jobId) {
        return suggestions(jobId, null);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional(readOnly = true)
    public List<ShareSuggestionResponse> suggestions(UUID jobId, UUID tripId) {
        TransportJob host = job(jobId);
        Trip trip = jobTrips.tripOf(jobId, tripId);
        List<TransportJob> onTrip = jobsOn(trip, host);
        if (onTrip.stream().anyMatch(j -> departed(j, trip))) return List.of();
        List<UUID> onTripIds = onTrip.stream().map(TransportJob::getId).toList();
        LocalDate planned = trip.getPlannedDepartureAt() == null
                ? null
                : trip.getPlannedDepartureAt().atZone(BusinessTime.ZONE).toLocalDate();
        List<ShareSuggestionResponse> suggestions = new ArrayList<>();
        for (TransportJob candidate :
                jobs.findShareCandidates(trip.getCorridor().getId())) {
            if (onTripIds.contains(candidate.getId())) continue;
            Days days;
            try {
                days = fit(trip, onTrip, candidate, jobTrips.tripOf(candidate.getId()));
            } catch (BusinessException | ConflictException doesNotFit) {
                continue;
            }
            boolean plannedFits = planned != null && !planned.isBefore(days.from()) && !planned.isAfter(days.to());
            suggestions.add(ShareSuggestionResponse.builder()
                    .job(JobMapper.toTripJobResponse(candidate))
                    .proposedDeparture(plannedFits ? planned : days.from())
                    .departFrom(days.from())
                    .departTo(days.to())
                    .horsesAdded(candidate.getRequest().getHorses().size())
                    .stallsLeft(loadPlans.stallsLeft(trip, candidate))
                    .warnings(biosecurity.forJoin(trip, candidate))
                    .build());
        }
        return suggestions;
    }

    private List<TransportJob> jobsOn(Trip trip, TransportJob host) {
        List<TransportJob> onTrip = jobTrips.jobsOn(trip);
        return onTrip.isEmpty() ? List.of(host) : onTrip;
    }

    /**
     * The days {@code job} may leave on {@code trip}: on the first trip of its journey, its requested date moved by up
     * to its flex days; on a later one (US-F3-16), that trip's own pickup moved by up to the corridor's flex days
     * (US-F3-18), since it leaves when the trip before has handed the horses on: never before the day they are ready.
     */
    private Days daysOn(TransportJob job, Trip trip) {
        if (jobTrips.partBefore(trip, job).isEmpty()) return Days.of(job);
        Days days = routePlans
                .pickupOn(trip, job)
                .map(at -> {
                    LocalDate day = at.atZone(BusinessTime.ZONE).toLocalDate();
                    int flex = trip.getCorridor().getDateFlexDays();
                    return new Days(day.minusDays(flex), day.plusDays(flex));
                })
                .orElseGet(() -> Days.of(job));
        return routePlans
                .readyOn(trip, job)
                .map(at -> at.atZone(BusinessTime.ZONE).toLocalDate())
                .filter(ready -> ready.isAfter(days.from()))
                .map(ready -> new Days(ready, days.to()))
                .orElse(days);
    }

    /**
     * Whether {@code joining}, now on {@code from}, can join {@code trip} (US-F3-11): the days every job on it could
     * leave, or a refusal that says why (a departed trip, a private trailer, another corridor, no common day, a horse
     * on both jobs, no room on the trailers or the flight, other airports).
     */
    private Days fit(Trip trip, List<TransportJob> onTrip, TransportJob joining, Trip from) {
        for (TransportJob j : onTrip) {
            if (departed(j, trip)) throw new BusinessException("Trip " + trip.getCode() + " has departed");
        }
        if (departed(joining, from)) throw new BusinessException(joining.getCode() + " has departed");

        for (TransportJob j : onTrip) requireShared(j);
        requireShared(joining);

        // The corridor of the trip the joining job is on: its request's, or one trip of its chain's (US-F3-16).
        if (!from.getCorridor().getId().equals(trip.getCorridor().getId())) {
            throw new BusinessException(joining.getCode() + " travels on another corridor than trip " + trip.getCode());
        }
        // A trip runs its corridor one way (US-F3-21): RD HCM → HAN driven from Hanoi doesn't take a job to Hanoi.
        if (from.isReversed() != trip.isReversed()) {
            throw new BusinessException(
                    "Trip " + trip.getCode() + " runs " + trip.getCorridor().getCode() + " from " + trip.startCity()
                            + "; " + joining.getCode() + " goes from " + from.startCity());
        }

        // One departure day inside every job's allowed days on these trips.
        Days joiningDays = daysOn(joining, from);
        Days days = joiningDays;
        for (TransportJob j : onTrip) {
            Days theirs = daysOn(j, trip);
            Days together = days.and(theirs);
            if (together.isEmpty()) {
                throw new ConflictException(
                        "DATES_DONT_FIT",
                        joining.getCode() + " can leave " + joiningDays + " and " + j.getCode() + " " + theirs
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
        // A trip that flies takes a job from the same airports, with room in its stall positions (US-F3-15).
        String cantFly = flights.cantFly(trip, from, joining);
        if (cantFly != null) {
            throw new ConflictException(
                    "FLIGHT_DOESNT_FIT", joining.getCode() + " can't fly with trip " + trip.getCode() + ": " + cantFly);
        }
        return days;
    }

    /**
     * Puts {@code joiningJobId} on {@code hostJobId}'s trip, with all its horses. Refused when a customer booked a
     * private trailer, on another corridor, when no departure day suits every job (naming whose dates rule it out),
     * or when the trailers lack room (add a trailer first, US-F3-10). The trip it leaves and the trip it joins
     * reopen: load plans back to draft, the route superseded by a draft with the job's pickup and delivery, and the
     * sign-off cleared.
     */
    @Transactional
    public ShareTripResponse share(
            UUID hostJobId, UUID joiningJobId, Collection<String> acceptedWarnings, User currentUser) {
        return share(hostJobId, null, joiningJobId, acceptedWarnings, currentUser);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional
    public ShareTripResponse share(
            UUID hostJobId, UUID tripId, UUID joiningJobId, Collection<String> acceptedWarnings, User currentUser) {
        TransportJob host = job(hostJobId);
        TransportJob joining = job(joiningJobId);
        Trip trip = jobTrips.tripOf(hostJobId, tripId);
        Trip from = jobTrips.tripOf(joiningJobId);
        return putOn(trip, jobsOn(trip, host), joining, from, acceptedWarnings, currentUser, " with " + host.getCode());
    }

    /**
     * Puts {@code joining}'s horses on {@code from} onto {@code trip} (US-F3-11, US-F3-18), once every check of joining
     * passes and its biosecurity warnings are accepted: their stops follow them, the trip reopens, and the trip they
     * leave releases its bookings and crew when nobody rides it any more.
     */
    private ShareTripResponse putOn(
            Trip trip,
            List<TransportJob> onTrip,
            TransportJob joining,
            Trip from,
            Collection<String> acceptedWarnings,
            User currentUser,
            String with) {
        if (from.getId().equals(trip.getId())) {
            throw new BusinessException(joining.getCode() + " is already on trip " + trip.getCode());
        }
        Days days = fit(trip, onTrip, joining, from);

        // Different health status warns but doesn't block: the coordinator accepts what it says (US-F3-12).
        biosecurity.requireAccepted(trip, biosecurity.forJoin(trip, joining), acceptedWarnings, currentUser);

        List<UUID> horses = jobTrips.horsesOn(from).stream()
                .filter(th -> th.getJob().getId().equals(joining.getId()))
                .map(th -> th.getHorse().getId())
                .toList();
        loadPlans.unload(from, horses);
        jobTrips.moveJob(joining, from, trip);

        String reason = joining.getCode() + " joined the trip";
        loadPlans.reopenTrip(trip, reason);
        // The job's stops on the trip it leaves (its pickup, its delivery or transfer) come with it.
        routePlans.copyJobStops(from, trip, joining);
        leaveBehind(from, joining, joining.getCode() + " moved to trip " + trip.getCode());
        flights.allocate(trip);
        joining.setSignedOffAt(null);
        joining.setSignedOffBy(null);

        audit.recordDecision(
                currentUser,
                "SHARE_TRIP",
                AuditText.fit(joining.getCode() + " put on trip " + trip.getCode() + with + "; departure " + days),
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
     * The confirmed trips on {@code jobId}'s corridor that its trip {@code tripId} (its current trip when null) could
     * join (US-F3-18): route confirmed, not departed, with someone on them. Those passing every check of joining come
     * first, with the departure days that suit both, the stalls left and the biosecurity warnings to accept; the others
     * follow with the reason they can't be joined. Each names the jobs on it, how many of them are cleared and the
     * earliest document deadline still open. A trip that has departed lists nothing.
     */
    @Transactional(readOnly = true)
    public List<JoinableTripResponse> joinable(UUID jobId, UUID tripId) {
        TransportJob joining = job(jobId);
        Trip from = jobTrips.tripOf(jobId, tripId);
        if (departed(joining, from)) return List.of();
        List<JoinableTripResponse> fitting = new ArrayList<>();
        List<JoinableTripResponse> notFitting = new ArrayList<>();
        for (Trip trip : trips.findJoinable(from.getCorridor().getId(), from.getId())) {
            List<TransportJob> onTrip = jobTrips.jobsOn(trip);
            if (onTrip.isEmpty()) continue;
            JoinableTripResponse.JoinableTripResponseBuilder row = JoinableTripResponse.builder()
                    .tripId(trip.getId())
                    .tripCode(trip.getCode())
                    .corridorCode(trip.getCorridor().getCode())
                    .mode(trip.getCorridor().getMode())
                    .plannedDepartureAt(trip.getPlannedDepartureAt())
                    .jobs(onTrip.stream().map(TransportJob::getCode).sorted().toList())
                    .jobsCleared((int) onTrip.stream()
                            .filter(j -> j.getDossierStatus() == DossierStatus.CLEARANCE_READY)
                            .count())
                    .documentsDueBy(onTrip.stream()
                            .flatMap(j -> checklist.findByJobId(j.getId()).stream())
                            .filter(item -> item.getStatus() != ChecklistStatus.CLEARED && item.getDueDate() != null)
                            .map(ChecklistItem::getDueDate)
                            .min(LocalDate::compareTo)
                            .orElse(null));
            Days days;
            try {
                days = fit(trip, onTrip, joining, from);
            } catch (BusinessException | ConflictException doesNotFit) {
                // Listed all the same, so the coordinator sees why: dates, room, airports, a private trailer.
                notFitting.add(row.fits(false)
                        .reason(doesNotFit.getMessage())
                        .warnings(List.of())
                        .build());
                continue;
            }
            fitting.add(row.fits(true)
                    .departFrom(days.from())
                    .departTo(days.to())
                    .stallsLeft(loadPlans.stallsLeft(trip, joining))
                    .warnings(biosecurity.forJoin(trip, joining))
                    .build());
        }
        fitting.addAll(notFitting);
        return fitting;
    }

    /**
     * Puts {@code jobId}'s trip {@code tripId} (its current trip when null) on the confirmed trip {@code targetTripId}
     * (US-F3-18): the reverse of {@link #share}, from the joining job's page. The same checks, warnings and reopening
     * apply.
     */
    @Transactional
    public ShareTripResponse join(
            UUID jobId, UUID tripId, UUID targetTripId, Collection<String> acceptedWarnings, User currentUser) {
        TransportJob joining = job(jobId);
        Trip from = jobTrips.tripOf(jobId, tripId);
        Trip trip = trips.findById(targetTripId).orElseThrow(() -> ResourceNotFoundException.of("Trip", targetTripId));
        List<TransportJob> onTrip = jobTrips.jobsOn(trip);
        if (onTrip.isEmpty()) {
            throw new BusinessException("Nobody rides trip " + trip.getCode() + ": there is nothing to join");
        }
        return putOn(trip, onTrip, joining, from, acceptedWarnings, currentUser, "");
    }

    /**
     * The biosecurity warnings for {@code jobId}'s trip (US-F3-12): if {@code withJobId} joined it, or as the trip's
     * trailers are loaded now.
     */
    @Transactional(readOnly = true)
    public List<BiosecurityWarningResponse> warnings(UUID jobId, UUID withJobId) {
        return warnings(jobId, null, withJobId);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional(readOnly = true)
    public List<BiosecurityWarningResponse> warnings(UUID jobId, UUID tripId, UUID withJobId) {
        Trip trip = jobTrips.tripOf(jobId, tripId);
        return withJobId == null ? biosecurity.forTrip(trip) : biosecurity.forJoin(trip, job(withJobId));
    }

    /**
     * Takes {@code leavingJobId} off {@code hostJobId}'s trip before departure, onto a new trip of its own: never onto
     * none. The trip it leaves reopens without its pickup and delivery, so the others can be planned and leave.
     */
    @Transactional
    public TripJobResponse takeOff(UUID hostJobId, UUID leavingJobId, User currentUser) {
        return takeOff(hostJobId, null, leavingJobId, currentUser);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional
    public TripJobResponse takeOff(UUID hostJobId, UUID tripId, UUID leavingJobId, User currentUser) {
        job(hostJobId);
        TransportJob leaving = job(leavingJobId);
        Trip trip = jobTrips.tripOf(hostJobId, tripId);
        List<TransportJob> onTrip = jobTrips.jobsOn(trip);
        if (onTrip.stream().noneMatch(j -> j.getId().equals(leavingJobId))) {
            throw new BusinessException(leaving.getCode() + " is not on trip " + trip.getCode());
        }
        if (onTrip.size() < 2) {
            throw new BusinessException(leaving.getCode() + " already travels alone on trip " + trip.getCode());
        }
        for (TransportJob j : onTrip) {
            if (departed(j, trip)) {
                throw new BusinessException("Trip " + trip.getCode()
                        + " has departed: a job leaves a moving trip only through an incident");
            }
        }

        List<UUID> horses = jobTrips.horsesOn(trip).stream()
                .filter(th -> th.getJob().getId().equals(leavingJobId))
                .map(th -> th.getHorse().getId())
                .toList();
        loadPlans.unload(trip, horses);
        // On the trip's corridor: one trip of the leaving job's chain keeps its own (US-F3-16).
        Trip own = jobTrips.newTrip(trip.getCorridor(), trip.isReversed(), currentUser, clock.instant());
        jobTrips.moveJob(leaving, trip, own);
        leaveBehind(trip, leaving, leaving.getCode() + " taken off the trip");
        leaving.setSignedOffAt(null);
        leaving.setSignedOffBy(null);
        notices.replanned(leaving, trip);

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
            crew.deleteByTripId(trip.getId());
            return;
        }
        loadPlans.reopenTrip(trip, reason);
        routePlans.removeJobStops(trip, job);
        flights.allocate(trip);
    }
}
