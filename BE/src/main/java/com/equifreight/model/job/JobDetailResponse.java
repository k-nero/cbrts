package com.equifreight.model.job;

import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record JobDetailResponse(
        UUID id,
        String code,
        /** The trip's TRP code; staff only. */
        String tripCode,
        String originCity,
        String destinationCity,
        JobStage stage,
        DossierStatus dossierStatus,
        TripStatus tripStatus,
        Instant plannedDepartureAt,
        Instant windowStart,
        Instant windowEnd,
        Instant clearanceReadyAt,
        String blockingReason,
        String nextStepOwner,
        /** The team assigned at approval (US-F1-07); null on jobs approved before teams were kept. */
        String transportSpecialist,
        String coordinator,
        String clearanceGateState, // "Locked" or "Clear"
        String clearanceGateSummary,
        List<JobHorseResponse> horses,
        TripLoadResponse loadPlan,
        RoutePlanResponse routePlan,
        List<CrewMemberResponse> crew) {}
