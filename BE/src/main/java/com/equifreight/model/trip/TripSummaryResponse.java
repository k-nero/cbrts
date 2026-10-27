package com.equifreight.model.trip;

import com.equifreight.entity.enums.Channel;
import com.equifreight.entity.enums.TripRecordKind;
import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
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
        List<String> jobCodes,
        /** Where the trip stands, on the office board only (US-F4-04); null elsewhere. */
        Progress progress,
        /** The request the job was approved from, on the customer's list only: its page tracks the trip. */
        UUID requestId) {

    /**
     * The leg the trip is on, from the last stop with a checkpoint to the next stop on its confirmed route, and its
     * last checkpoint with who recorded it and from where (the cab, or the office on the escort's behalf).
     */
    public record Progress(
            String tripCode,
            String legFrom,
            String legTo,
            TripRecordKind lastKind,
            String lastStop,
            Instant lastAt,
            String lastRecordedBy,
            Channel lastChannel) {}

    /** All the escort's or the customer's fields, without the office's progress. */
    public TripSummaryResponse(
            String jobCode,
            TripStatus tripStatus,
            String origin,
            String destination,
            Instant lastUpdate,
            String tripCode,
            List<String> jobCodes) {
        this(jobCode, tripStatus, origin, destination, lastUpdate, tripCode, jobCodes, null, null);
    }

    public TripSummaryResponse withProgress(Progress progress) {
        return new TripSummaryResponse(
                jobCode, tripStatus, origin, destination, lastUpdate, tripCode, jobCodes, progress, requestId);
    }

    /** A job's row, as the customer's and the office's lists select it. */
    public TripSummaryResponse(
            String jobCode, TripStatus tripStatus, String origin, String destination, Instant lastUpdate) {
        this(jobCode, tripStatus, origin, destination, lastUpdate, null, List.of(jobCode));
    }

    /** A job's row on the customer's list, with the request its page opens. */
    public TripSummaryResponse(
            String jobCode,
            TripStatus tripStatus,
            String origin,
            String destination,
            Instant lastUpdate,
            UUID requestId) {
        this(jobCode, tripStatus, origin, destination, lastUpdate, null, List.of(jobCode), null, requestId);
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
