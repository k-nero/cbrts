package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.QuarantinePeriod;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Who hears when a quarantine is scheduled, changed or completed (US-F3-22, docs/notification-centre.md). The job's
 * coordinator opens the Trip tab to plan around it; the club opens its trip tracking and hears where its horses wait
 * and until when. The logistics manager who approved the job hears only when the quarantine clashes with the trips
 * already planned. Each notice is keyed by the quarantine, so a repeat replaces an unread one.
 */
@Service
public class QuarantineNotices {

    private final NotificationService notifications;
    private final JourneyService journeys;

    public QuarantineNotices(NotificationService notifications, JourneyService journeys) {
        this.notifications = notifications;
        this.journeys = journeys;
    }

    /** {@code q} was scheduled for its job. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void scheduled(QuarantinePeriod q) {
        TransportJob job = q.getJob();
        String key = "QUARANTINE_SCHEDULED:" + q.getId();
        coordinator(
                NotificationKind.QUARANTINE_SCHEDULED,
                job,
                "Quarantine scheduled for " + job.getCode(),
                where(q) + ". Plan a trip that brings the horses there by " + day(q.getStartsOn())
                        + " and one that collects them from " + day(q.getEndsOn()) + ".",
                key);
        club(
                NotificationKind.QUARANTINE_SCHEDULED,
                job,
                "Your horses' quarantine is scheduled",
                "Before they travel, " + job.getCode() + "'s horses stay at "
                        + q.getPlace().getName() + " from "
                        + day(q.getStartsOn()) + " to " + day(q.getEndsOn())
                        + " for their quarantine. We take them there and collect them afterwards.",
                key);
        clashes(q);
    }

    /** {@code q} moved; {@code before} is how it read before: "Đại Nam Racecourse isolation barn, 11–25 Nov". */
    @Transactional(propagation = Propagation.MANDATORY)
    public void changed(QuarantinePeriod q, String before) {
        TransportJob job = q.getJob();
        String key = "QUARANTINE_CHANGED:" + q.getId();
        coordinator(
                NotificationKind.QUARANTINE_CHANGED,
                job,
                "Quarantine for " + job.getCode() + " changed",
                "Now " + where(q) + "; it was " + before + ". Check the trips on either side of it.",
                key);
        club(
                NotificationKind.QUARANTINE_CHANGED,
                job,
                "New quarantine dates for " + job.getCode(),
                "Your horses now stay at " + q.getPlace().getName() + " from " + day(q.getStartsOn()) + " to "
                        + day(q.getEndsOn()) + ".",
                key);
        clashes(q);
    }

    /** {@code q} was signed off. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void completed(QuarantinePeriod q) {
        TransportJob job = q.getJob();
        String key = "QUARANTINE_COMPLETED:" + q.getId();
        coordinator(
                NotificationKind.QUARANTINE_COMPLETED,
                job,
                "Quarantine for " + job.getCode() + " completed",
                "The horses' quarantine at " + q.getPlace().getName()
                        + " was signed off. The trip that collects them can go ahead.",
                key);
        club(
                NotificationKind.QUARANTINE_COMPLETED,
                job,
                "Your horses have finished quarantine",
                job.getCode() + "'s quarantine at " + q.getPlace().getName()
                        + " is complete, and the horses can travel on.",
                key);
    }

    /** "Đại Nam Racecourse isolation barn, 11–25 Nov". */
    public static String where(QuarantinePeriod q) {
        return q.getPlace().getName() + ", " + QuarantineRules.period(q.getStartsOn(), q.getEndsOn());
    }

    /** The approving manager hears only when the quarantine clashes with the trips already planned. */
    private void clashes(QuarantinePeriod q) {
        TransportJob job = q.getJob();
        User manager = job.getApprovedBy();
        if (manager == null) return;
        List<String> clashes = journeys.clashes(job, q);
        if (clashes.isEmpty()) return;
        notifications.notify(
                NotificationKind.QUARANTINE_CONFLICT,
                Audience.staff(manager),
                Subject.tracking(job),
                "Quarantine clashes with " + job.getCode() + "'s planned trips",
                String.join(" ", clashes) + " The coordinator has been told.",
                "QUARANTINE_CONFLICT:" + q.getId());
    }

    private void coordinator(NotificationKind kind, TransportJob job, String title, String body, String key) {
        if (job.getCoordinator() == null) return;
        notifications.notify(kind, Audience.staff(job.getCoordinator()), Subject.tracking(job), title, body, key);
    }

    private void club(NotificationKind kind, TransportJob job, String title, String body, String key) {
        if (job.getRequest() == null || job.getRequest().getClub() == null) return;
        notifications.notify(
                kind, Audience.club(job.getRequest().getClub().getId()), Subject.tracking(job), title, body, key);
    }

    private static String day(LocalDate day) {
        return BusinessTime.SHORT_DAY.format(day);
    }
}
