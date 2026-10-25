package com.equifreight.model.job;

import com.equifreight.entity.enums.TransportMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A confirmed trip a job could join (US-F3-18): where and when it goes, the departure days that suit every job once
 * the job is on it, the stalls left, the jobs already on it with how many are cleared and the earliest document
 * deadline still open, and the biosecurity warnings joining raises.
 */
@Builder
public record JoinableTripResponse(
        UUID tripId,
        String tripCode,
        String corridorCode,
        TransportMode mode,
        Instant plannedDepartureAt,
        LocalDate departFrom,
        LocalDate departTo,
        /** Stalls left on the trailers once the job is on; null for a trip that only flies. */
        Integer stallsLeft,
        List<String> jobs,
        int jobsCleared,
        /** The earliest due date of a document not cleared yet, of every job on the trip; null when none is open. */
        LocalDate documentsDueBy,
        List<BiosecurityWarningResponse> warnings) {}
