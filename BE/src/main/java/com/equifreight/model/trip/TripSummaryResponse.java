package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

/**
 * A row of a trip list. The customer's and the office's lists have a row per job; the escort's a row per trip, with
 * the trip's TRP code and every job it carries ({@code jobCode} is the one its page opens with).
 */
@Builder
public record TripSummaryResponse(
        String jobCode,
        TripStatus tripStatus,
        String origin,
        String destination,
        Instant lastUpdate,
        /** The trip's TRP code on the escort's list; null elsewhere. */
        String tripCode,
        /** The jobs on the escort's trip; the one job elsewhere. */
        List<String> jobCodes) {

    /** A job's row, as the customer's and the office's lists select it. */
    public TripSummaryResponse(
            String jobCode, TripStatus tripStatus, String origin, String destination, Instant lastUpdate) {
        this(jobCode, tripStatus, origin, destination, lastUpdate, null, List.of(jobCode));
    }

    /** A job's row on a trip the escort crews; the service folds a trip's rows into one. */
    public TripSummaryResponse(
            String jobCode,
            TripStatus tripStatus,
            String origin,
            String destination,
            Instant lastUpdate,
            String tripCode) {
        this(jobCode, tripStatus, origin, destination, lastUpdate, tripCode, List.of(jobCode));
    }
}
