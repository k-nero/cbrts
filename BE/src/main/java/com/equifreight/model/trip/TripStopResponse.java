package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripRecordKind;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
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
        String latestRecordedBy,
        List<TripBorderDocumentResponse> borderDocuments) {}
