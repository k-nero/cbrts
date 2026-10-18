package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripRecordKind;

import java.time.Instant;
import java.util.UUID;

public record TripStopResponse(
        UUID id,
        short sequence,
        String kind,
        String name,
        Instant plannedAt,
        Short plannedStayMin,
        String details,
        TripRecordKind latestStatus,
        Instant latestOccurredAt,
        String latestNote,
        String latestRecordedBy
) {
}
