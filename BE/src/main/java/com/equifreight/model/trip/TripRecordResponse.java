package com.equifreight.model.trip;

import com.equifreight.entity.enums.Channel;
import com.equifreight.entity.enums.TripRecordKind;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TripRecordResponse(
        UUID id,
        UUID routeStopId,
        String checkpointName,
        TripRecordKind kind,
        Instant occurredAt,
        Instant receivedAt,
        UUID clientRef,
        String recordedBy,
        Channel channel,
        String text,
        List<TripConditionResponse> conditions) {}
