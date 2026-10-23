package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripRecordKind;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record TripStopResponse(
        UUID id,
        short sequence,
        /** The stop's kind; for the customer, {@code ON_THE_WAY} on a stop only another job needs. */
        String kind,
        /** On a shared trip, staff and the crew see whose pickup or delivery a stop is; null for the customer. */
        String jobCode,
        String name,
        Instant plannedAt,
        Short plannedStayMin,
        String details,
        TripRecordKind latestStatus,
        Instant latestOccurredAt,
        String latestNote,
        String latestRecordedBy) {}
