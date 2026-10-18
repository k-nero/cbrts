package com.equifreight.model.job;

import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class JobDetailResponse {
    private UUID id;
    private String code;
    private String originCity;
    private String destinationCity;
    private JobStage stage;
    private DossierStatus dossierStatus;
    private TripStatus tripStatus;
    private Instant plannedDepartureAt;
    private Instant windowStart;
    private Instant windowEnd;
    private Instant clearanceReadyAt;
    private String blockingReason;
    private String nextStepOwner;
    private String clearanceGateState; // "Locked" or "Clear"
    private String clearanceGateSummary;

    private List<JobHorseResponse> horses;
    private LoadPlanResponse loadPlan;
    private RoutePlanResponse routePlan;
    private List<CrewMemberResponse> crew;
}
