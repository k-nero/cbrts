package com.equifreight.model.incident;

import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.model.review.HistoryEntryResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** One incident on a job's trip record, with its timeline from the audit trail, oldest first (US-F5-05). */
@Builder
public record JobIncidentResponse(
        UUID id,
        IncidentKind kind,
        String kindLabel,
        IncidentStatus status,
        String summary,
        Instant openedAt,
        String ownerName,
        /** The arrival the latest delay alert announced, or null. */
        Instant etaAt,
        String resolution,
        String closingNote,
        Instant resolvedAt,
        String resolvedByName,
        List<HistoryEntryResponse> timeline) {}
