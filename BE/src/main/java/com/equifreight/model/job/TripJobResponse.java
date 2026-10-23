package com.equifreight.model.job;

import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

/**
 * A job as the coordinator sees it on a shared trip, or as a job that could join one (US-F3-11): its code, route,
 * horses, the departure dates it allows, and whether its dossier is cleared.
 */
@Builder
public record TripJobResponse(
        UUID jobId,
        String code,
        String origin,
        String destination,
        int horses,
        LocalDate departureDate,
        short dateFlexDays,
        boolean clearanceReady,
        boolean departed) {}
