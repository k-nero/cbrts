package com.equifreight.model.job;

import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
public class JobSummaryResponse {
    private UUID id;
    private String code;
    private String originCity;
    private String destinationCity;
    private int horseCount;
    private List<String> horseNames;
    private JobStage stage;
    private DossierStatus dossierStatus;
    private TripStatus tripStatus;
    private Instant plannedDepartureAt;
    private Instant windowStart;
    private Instant windowEnd;
    private Instant clearanceReadyAt;
    private String blockingReason;
    private String nextStepOwner;
}
