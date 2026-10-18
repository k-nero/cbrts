package com.equifreight.model.job;

import com.equifreight.entity.enums.LoadPlanStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record LoadPlanResponse(
        UUID id,
        UUID jobId,
        UUID vehicleId,
        String vehicleCode,
        LoadPlanStatus status,
        String confirmedByName,
        Instant confirmedAt,
        int totalWeightKg,
        int payloadKg,
        List<LoadPlanStallResponse> stalls,
        List<JobHorseResponse> unassignedHorses,
        List<LoadPlanConflictResponse> conflicts) {}
