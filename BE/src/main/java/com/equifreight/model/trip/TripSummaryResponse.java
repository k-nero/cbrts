package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripStatus;

import java.time.Instant;

public record TripSummaryResponse(
        String jobCode,
        TripStatus tripStatus,
        String origin,
        String destination,
        Instant lastUpdate
) {
}
