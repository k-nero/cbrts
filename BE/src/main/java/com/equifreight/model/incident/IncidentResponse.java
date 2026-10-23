package com.equifreight.model.incident;

import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentSource;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.model.trip.TripPhotoResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * An incident as staff read it: the report quoted as written, with its time and author, the job it happened on and
 * who was alerted.
 */
public record IncidentResponse(
        UUID id,
        UUID jobId,
        String jobCode,
        /** The job's trip; staff only. */
        String tripCode,
        TripStatus tripStatus,
        String origin,
        String destination,
        IncidentKind kind,
        String kindLabel,
        IncidentStatus status,
        IncidentSource source,
        String summary,
        String location,
        String horseName,
        Instant openedAt,
        String reportedByName,
        String ownerName,
        String coordinatorName,
        List<TripPhotoResponse> photos,
        /** The job's quotation currency: every cost on the incident is in it. */
        String currency,
        List<IncidentOptionResponse> options,
        /** The option waiting for the manager's approval (US-F5-02), or null. */
        UUID proposedOptionId,
        String proposedByName,
        Instant proposedAt,
        String proposalNote) {}
