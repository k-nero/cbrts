package com.equifreight.model.incident;

import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentSource;
import com.equifreight.entity.enums.IncidentStatus;
import java.time.Instant;
import java.util.UUID;

/** A row of the Incidents list. */
public record IncidentSummaryResponse(
        UUID id,
        String jobCode,
        IncidentKind kind,
        String kindLabel,
        IncidentStatus status,
        IncidentSource source,
        String summary,
        String location,
        String horseName,
        Instant openedAt,
        String ownerName) {}
