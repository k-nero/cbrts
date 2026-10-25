package com.equifreight.model.job;

import com.equifreight.entity.enums.TransportMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A confirmed trip on a job's corridor (US-F3-18): where and when it goes, the jobs already on it with how many are
 * cleared and the earliest document deadline still open. One the job fits has the departure days that suit every job
 * once it is on, the stalls left and the biosecurity warnings joining raises; one it doesn't has the reason.
 */
@Builder
public record JoinableTripResponse(
        UUID tripId,
        /** Whether the job passes every check of joining; when not, {@code reason} says which fails. */
        boolean fits,
        String reason,
        String tripCode,
        String corridorCode,
        TransportMode mode,
        Instant plannedDepartureAt,
        /** The departure days that suit every job once the job is on; null when it doesn't fit. */
        LocalDate departFrom,
        LocalDate departTo,
        /** Stalls left on the trailers once the job is on; null for a trip that only flies. */
        Integer stallsLeft,
        List<String> jobs,
        int jobsCleared,
        /** The earliest due date of a document not cleared yet, of every job on the trip; null when none is open. */
        LocalDate documentsDueBy,
        List<BiosecurityWarningResponse> warnings) {}
