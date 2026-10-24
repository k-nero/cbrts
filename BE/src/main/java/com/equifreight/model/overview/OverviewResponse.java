package com.equifreight.model.overview;

import com.equifreight.model.incident.IncidentSummaryResponse;
import com.equifreight.model.job.JobSummaryResponse;
import com.equifreight.model.review.QueueRowResponse;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

/**
 * The logistics manager's Overview (US-R-01): what needs attention, each count with the one case that matters most,
 * and each opening the list behind it.
 */
@Builder
public record OverviewResponse(
        Instant asOf,
        /** Requests waiting for review or approval, and the oldest few, oldest first. */
        long awaitingReview,
        List<QueueRowResponse> reviewQueue,
        /** Issued quotations waiting for the customer, and the next to expire. */
        long quotesOut,
        QuoteOutResponse nextToExpire,
        /** Jobs whose dossier isn't cleared, and the ones leaving soonest with what holds each. */
        long jobsBlocked,
        List<JobSummaryResponse> clearanceAtRisk,
        /** Incidents still open, and the newest. */
        long incidentsOpen,
        IncidentSummaryResponse newestIncident,
        /** Jobs departing in the next 7 days, and the next to leave. */
        long departingThisWeek,
        JobSummaryResponse nextDeparture) {}
