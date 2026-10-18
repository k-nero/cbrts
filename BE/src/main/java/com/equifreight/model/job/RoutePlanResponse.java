package com.equifreight.model.job;

import com.equifreight.entity.enums.RoutePlanStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record RoutePlanResponse(
        UUID id,
        UUID jobId,
        short versionNo,
        RoutePlanStatus status,
        Integer distanceKm,
        Integer durationMin,
        String confirmedByName,
        Instant confirmedAt,
        Instant supersededAt,
        String changeReason,
        List<RouteStopResponse> stops,
        List<RouteLegResponse> legs) {}
