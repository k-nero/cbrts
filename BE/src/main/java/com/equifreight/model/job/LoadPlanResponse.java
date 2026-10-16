package com.equifreight.model.job;

import com.equifreight.entity.enums.LoadPlanStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
public class LoadPlanResponse {
    private UUID id;
    private UUID jobId;
    private UUID vehicleId;
    private String vehicleCode;
    private LoadPlanStatus status;
    private String confirmedByName;
    private Instant confirmedAt;
    private int totalWeightKg;
    private int payloadKg;
    private List<LoadPlanStallResponse> stalls;
    private List<JobHorseResponse> unassignedHorses;
    private List<LoadPlanConflictResponse> conflicts;
}
