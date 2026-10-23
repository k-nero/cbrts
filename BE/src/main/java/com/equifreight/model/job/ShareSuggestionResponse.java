package com.equifreight.model.job;

import java.time.LocalDate;
import java.util.List;
import lombok.Builder;

/**
 * An approved job that could share this job's trailer (US-F3-13): it passes every check of joining the trip, with
 * the departure the app proposes, the horses it adds, the stalls left after combining, and what sharing would mix.
 * Nothing combines until the coordinator chooses it.
 */
@Builder
public record ShareSuggestionResponse(
        TripJobResponse job,
        /** The trip's planned departure day when every job allows it, else the first day they all do. */
        LocalDate proposedDeparture,
        LocalDate departFrom,
        LocalDate departTo,
        int horsesAdded,
        /** Stalls free on the trip's trailers after combining; null while the trip has no trailer. */
        Integer stallsLeft,
        List<BiosecurityWarningResponse> warnings) {}
