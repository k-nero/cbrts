package com.equifreight.model.incident;

import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentSource;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.model.review.HistoryEntryResponse;
import com.equifreight.model.trip.TripPhotoResponse;
import java.math.BigDecimal;
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
        String proposalNote,
        /** The approved option (US-F5-03), or null. */
        UUID decidedOptionId,
        String decidedByName,
        Instant decidedAt,
        String decisionNote,
        /** What the customer was told, as written. */
        String customerMessage,
        Boolean chargeCustomer,
        /** The extra cost attached to the job for the final invoice, or null. */
        BigDecimal chargedAmount,
        /** The route version the decision gave the trip, or null. */
        Short routePlanVersion,
        /** The trip the leaving horses moved to (US-F5-06), staff only. */
        String newTripCode,
        /** The job's horses on its moving trip, which an option can take off it (US-F5-06). */
        List<RidingHorse> riding,
        /** The arrival the latest delay alert announced (US-F5-04), or null. */
        Instant etaAt,
        /** How it ended and the closing note, once the logistics manager closed it (US-F5-05). */
        String resolution,
        String closingNote,
        Instant resolvedAt,
        String resolvedByName,
        /** What happened to the incident, from the audit trail, oldest first. */
        List<HistoryEntryResponse> timeline) {

    public record RidingHorse(UUID id, String name) {}
}
