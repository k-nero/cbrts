package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.RouteStop;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.model.trip.TripMapper;
import com.equifreight.repository.RoutePlanRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * What the customer is told when their job's trip changes (US-F3-14, docs/shared-trips-design.md, Customer
 * notifications). Every notice goes to the job's club, names only the job's own {@code CBRT} code and opens its
 * tracking, and none of them names, counts or describes another client. Each is keyed by the job and the confirmation
 * (or trip) it is about, so a repeat replaces an unread notice instead of stacking.
 */
@Service
public class TripNotices {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final NotificationService notifications;
    private final RoutePlanRepository routePlans;

    public TripNotices(NotificationService notifications, RoutePlanRepository routePlans) {
        this.notifications = notifications;
        this.routePlans = routePlans;
    }

    /** A job's planned departure and arrival, as they stood before a confirmation. */
    public record Times(Instant departure, Instant arrival) {}

    public static Map<UUID, Times> timesOf(List<TransportJob> jobs) {
        Map<UUID, Times> times = new HashMap<>();
        jobs.forEach(j -> times.put(j.getId(), new Times(j.getPlannedDepartureAt(), j.getPlannedArrivalAt())));
        return times;
    }

    /**
     * After {@code plan} is confirmed for {@code trip}: a job that now shares the trailer, and didn't on the trip's last
     * confirmed route, hears {@code TRIP_SHARED}; a job that already had times hears {@code TRIP_TIMES_CHANGED} when
     * they moved, or when it came to this trip from another one (taken off a shared trip and planned again).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void confirmed(Trip trip, RoutePlan plan, List<TransportJob> jobs, Map<UUID, Times> before) {
        Optional<RoutePlan> previous =
                routePlans.findFirstByTrip_IdAndConfirmedAtIsNotNullAndIdNotOrderByConfirmedAtDesc(
                        trip.getId(), plan.getId());
        Set<UUID> previousJobs = previous.map(TripNotices::jobsOn).orElse(Set.of());
        boolean shared = jobs.size() > 1;
        for (TransportJob job : jobs) {
            boolean wasShared = previousJobs.size() > 1 && previousJobs.contains(job.getId());
            Times was = before.get(job.getId());
            if (shared && !wasShared) {
                tripShared(job, plan);
            } else if (was != null
                    && was.departure() != null
                    && (!previousJobs.contains(job.getId())
                            || !Objects.equals(was.departure(), job.getPlannedDepartureAt())
                            || !Objects.equals(was.arrival(), job.getPlannedArrivalAt()))) {
                timesChanged(job, plan);
            }
        }
    }

    /**
     * {@code job} was taken off a shared trip before departure. Only a customer who was given times hears about it;
     * the first sentence gives the job's own reason.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void replanned(TransportJob job, Trip from) {
        if (job.getPlannedDepartureAt() == null) return;
        String day = day(job.getPlannedDepartureAt());
        String why = job.getDossierStatus() != DossierStatus.CLEARANCE_READY
                ? "Your documents weren't cleared in time for the trailer leaving on " + day
                : "The plan for the trailer leaving on " + day + " changed";
        notify(
                NotificationKind.JOB_REPLANNED,
                job,
                job.getCode() + " is being replanned",
                why + ", so your horses won't travel on it. We're planning a new departure"
                        + (job.getWindowEnd() == null ? "" : " inside your window")
                        + " and will confirm it here. Your price doesn't change.",
                "JOB_REPLANNED:" + job.getId() + ":" + from.getId());
    }

    /**
     * Another job's arrival moved because an incident on its trip was decided (US-F5-06): the customer hears only what
     * changes for them, never why or whose horses.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void arrivalMoved(TransportJob job, RoutePlan plan) {
        if (job.getPlannedArrivalAt() == null) return;
        StringBuilder body = new StringBuilder("Your horses now arrive on ").append(at(job.getPlannedArrivalAt()));
        if (job.getWindowEnd() != null) {
            body.append(
                    job.getPlannedArrivalAt().isAfter(job.getWindowEnd())
                            ? ", after your window closes; we'll be in touch about it"
                            : ", still inside your window");
        }
        body.append(". Your price doesn't change.");
        notify(
                NotificationKind.TRIP_TIMES_CHANGED,
                job,
                "New arrival time for " + job.getCode(),
                body.toString(),
                "TRIP_TIMES_CHANGED:" + job.getId() + ":" + plan.getId());
    }

    /**
     * A delay alert reaches the job's club (US-F5-04): why, the new arrival and how much later it is. Only the job the
     * alert was raised on carries the coordinator's note, which may name its horses; another client on the trip hears
     * the reason and its own time.
     */
    public void delayAlert(TransportJob job, IncidentKind reason, String note, int delayMinutes, UUID incidentId) {
        if (job.getPlannedArrivalAt() == null) return;
        StringBuilder body = new StringBuilder();
        if (note != null) body.append(note).append(note.matches(".*[.!?]$") ? " " : ". ");
        body.append("Your horses now arrive on ")
                .append(at(job.getPlannedArrivalAt()))
                .append(", about ")
                .append(IncidentService.duration(delayMinutes))
                .append(" later than planned");
        if (job.getWindowEnd() != null) {
            body.append(
                    job.getPlannedArrivalAt().isAfter(job.getWindowEnd())
                            ? ", after your window closes; we'll be in touch about it"
                            : ", still inside your window");
        }
        body.append(". Your price doesn't change.");
        notify(
                NotificationKind.DELAY_ALERT,
                job,
                "Delay on " + job.getCode() + ": " + reason.label(),
                body.toString(),
                "DELAY_ALERT:" + job.getId() + ":" + incidentId);
    }

    /**
     * The horses of {@code job} cleared customs at {@code stop} (US-F4-05). Keyed by the border, so a second record of
     * the same crossing replaces an unread notice.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void clearedCustoms(TransportJob job, RouteStop stop, Instant at, UUID recordId) {
        String place = stop == null ? "the border" : TripMapper.stopName(stop);
        notify(
                NotificationKind.HORSES_CLEARED_CUSTOMS,
                job,
                "Your horses cleared customs at " + place,
                job.getCode() + " cleared customs at " + place + " on " + at(at)
                        + " and is on its way. Follow it leg by leg on the tracking page.",
                "HORSES_CLEARED_CUSTOMS:" + job.getId() + ":" + (stop == null ? recordId : stop.getId()));
    }

    /**
     * The horses of {@code job} reached the handover point (US-F4-05). Keyed by the job and trip, so a second arrival
     * record replaces an unread notice.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void arrived(TransportJob job, Trip trip, RouteStop stop, Instant at) {
        String place = stop == null ? "the handover point" : TripMapper.stopName(stop);
        notify(
                NotificationKind.HORSES_ARRIVED,
                job,
                "Your horses have arrived at " + place,
                job.getCode() + " reached " + place + " on " + at(at)
                        + ". The escort hands the horses over there, and you confirm the handover on the tracking page.",
                "HORSES_ARRIVED:" + job.getId() + ":" + trip.getId());
    }

    private void tripShared(TransportJob job, RoutePlan plan) {
        notify(
                NotificationKind.TRIP_SHARED,
                job,
                "Your horses will share a trailer",
                job.getCode() + " will travel with another client's horses on the same trailer, leaving "
                        + leaving(job, plan) + ". "
                        + (job.getWindowEnd() == null
                                ? "Your price and your documents don't change."
                                : "Your price, your arrival window and your documents don't change.")
                        + " Each horse keeps its own stall, and the escort cares for"
                        + " every horse on board.",
                "TRIP_SHARED:" + job.getId() + ":" + plan.getId());
    }

    private void timesChanged(TransportJob job, RoutePlan plan) {
        StringBuilder body = new StringBuilder("Your horses now leave ").append(leaving(job, plan));
        if (job.getPlannedArrivalAt() != null) {
            body.append(" and arrive on ").append(at(job.getPlannedArrivalAt()));
            if (job.getWindowEnd() != null && !job.getPlannedArrivalAt().isAfter(job.getWindowEnd())) {
                body.append(", still inside your window");
            }
        }
        body.append(". Your price doesn't change.");
        notify(
                NotificationKind.TRIP_TIMES_CHANGED,
                job,
                "New times for " + job.getCode(),
                body.toString(),
                "TRIP_TIMES_CHANGED:" + job.getId() + ":" + plan.getId());
    }

    private void notify(NotificationKind kind, TransportJob job, String title, String body, String dedupeKey) {
        notifications.notify(
                kind, Audience.club(job.getRequest().getClub().getId()), Subject.tracking(job), title, body, dedupeKey);
    }

    /** "Hồ Chí Minh City on 18 Oct at 13:00": the job's own pickup, where its horses board. */
    private static String leaving(TransportJob job, RoutePlan plan) {
        Optional<RouteStop> pickup = plan.getStops().stream()
                .filter(st -> st.getKind() == RouteStopKind.PICKUP
                        && st.getJob() != null
                        && st.getJob().getId().equals(job.getId()))
                .findFirst();
        String place = pickup.map(TripMapper::stopName)
                .orElseGet(() -> job.getRequest().getOriginPlace() == null
                        ? "the pickup"
                        : job.getRequest().getOriginPlace().getName());
        Instant when = pickup.map(RouteStop::getPlannedAt).orElse(job.getPlannedDepartureAt());
        return when == null ? place : place + " on " + at(when);
    }

    private static Set<UUID> jobsOn(RoutePlan plan) {
        return plan.getStops().stream()
                .map(RouteStop::getJob)
                .filter(Objects::nonNull)
                .map(TransportJob::getId)
                .collect(Collectors.toSet());
    }

    private static String day(Instant at) {
        return at.atZone(BusinessTime.ZONE).format(BusinessTime.SHORT_DAY);
    }

    private static String at(Instant at) {
        return day(at) + " at " + at.atZone(BusinessTime.ZONE).format(TIME);
    }
}
