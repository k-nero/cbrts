package com.equifreight.model.job;

import com.equifreight.entity.enums.RouteStopKind;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record RouteStopResponse(
        UUID id,
        short seq,
        RouteStopKind kind,
        /** The job a PICKUP or DELIVERY stop is for; null for a stop of the whole trip. */
        UUID jobId,
        String jobCode,
        UUID placeId,
        String placeName,
        UUID borderCrossingId,
        String borderCrossingName,
        Instant plannedAt,
        Short plannedStayMin,
        String details) {}
