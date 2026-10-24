package com.equifreight.service;

import com.equifreight.entity.Incident;
import com.equifreight.entity.TransportJob;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * How late the horses arrived (PRODUCT.md, arrival window): the minutes they were delivered after {@code due} (the
 * window's close), less the minutes an incident stopped the clock in that time (an authority hold, a welfare stop).
 */
public final class LateArrival {

    /**
     * Without an arrival window, the planned arrival plus this much still counts as on time (US-R-03). A window is
     * the promise itself, so it has none.
     */
    public static final Duration PLANNED_ARRIVAL_TOLERANCE = Duration.ofMinutes(30);

    private LateArrival() {}

    /** When the job is due: its window's close, or its planned arrival plus the tolerance; null with neither. */
    public static Instant dueOf(TransportJob job) {
        if (job.getWindowEnd() != null) return job.getWindowEnd();
        return job.getPlannedArrivalAt() == null
                ? null
                : job.getPlannedArrivalAt().plus(PLANNED_ARRIVAL_TOLERANCE);
    }

    /**
     * How late the job's horses arrived, as closing a job and the on-time rate both count it: past the window less a
     * stopped clock, or past the planned arrival and its tolerance. Zero when on time; null without a due time.
     */
    public static Integer of(TransportJob job, Instant delivered, List<Incident> clockStops) {
        return minutes(dueOf(job), delivered, job.getWindowEnd() != null ? clockStops : List.of());
    }

    /** What on time was measured against, in words. */
    public static String measuredAgainst(TransportJob job) {
        return job.getWindowEnd() != null
                ? "the arrival window"
                : "the planned arrival, with " + PLANNED_ARRIVAL_TOLERANCE.toMinutes() + " minutes' tolerance";
    }

    /** Zero when delivered by {@code due}; null when either time is missing. */
    public static Integer minutes(Instant due, Instant delivered, List<Incident> clockStops) {
        if (due == null || delivered == null) return null;
        if (!delivered.isAfter(due)) return 0;
        long stopped = 0;
        for (Incident incident : clockStops) {
            if (incident.getClockStoppedFrom() == null) continue;
            Instant start = incident.getClockStoppedFrom().isAfter(due) ? incident.getClockStoppedFrom() : due;
            Instant until = incident.getClockStoppedUntil() == null ? delivered : incident.getClockStoppedUntil();
            Instant end = until.isBefore(delivered) ? until : delivered;
            if (end.isAfter(start)) stopped += Duration.between(start, end).toMinutes();
        }
        return (int) Math.max(0, Duration.between(due, delivered).toMinutes() - stopped);
    }
}
