package com.equifreight.model.job;

import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record JobSummaryResponse(
        UUID id,
        String code,
        String originCity,
        String destinationCity,
        int horseCount,
        List<String> horseNames,
        JobStage stage,
        DossierStatus dossierStatus,
        TripStatus tripStatus,
        Instant plannedDepartureAt,
        Instant windowStart,
        Instant windowEnd,
        Instant clearanceReadyAt,
        String blockingReason,
        String nextStepOwner) {}
