package com.equifreight.model.clearance;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record QuarantinePeriodResponse(
        UUID id,
        UUID jobId,
        UUID horseId,
        String horseName,
        UUID placeId,
        String placeName,
        LocalDate startsOn,
        LocalDate endsOn,
        Instant completedAt,
        boolean isCompleted) {}
