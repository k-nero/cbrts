package com.equifreight.service;

import com.equifreight.entity.Incident;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * How late the horses arrived (PRODUCT.md, arrival window): the minutes they were delivered after {@code due} (the
 * window's close), less the minutes an incident stopped the clock in that time (an authority hold, a welfare stop).
 */
public final class LateArrival {

    private LateArrival() {}

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
