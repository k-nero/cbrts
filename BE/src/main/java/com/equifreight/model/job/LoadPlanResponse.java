package com.equifreight.model.job;

import com.equifreight.entity.enums.LoadPlanStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** One trailer's load plan on the trip; the horses still to place are the trip's ({@link TripLoadResponse}). */
@Builder
public record LoadPlanResponse(
        UUID id,
        UUID jobId,
        UUID tripVehicleId,
        /** The trailer's place in the convoy, from 1. */
        int seq,
        UUID vehicleId,
        String vehicleCode,
        LoadPlanStatus status,
        String confirmedByName,
        Instant confirmedAt,
        int totalWeightKg,
        int payloadKg,
        List<LoadPlanStallResponse> stalls,
        List<LoadPlanConflictResponse> conflicts) {}
