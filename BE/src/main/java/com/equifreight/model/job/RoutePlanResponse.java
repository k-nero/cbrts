package com.equifreight.model.job;

import com.equifreight.entity.enums.RoutePlanStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
public class RoutePlanResponse {
    private UUID id;
    private UUID jobId;
    private short versionNo;
    private RoutePlanStatus status;
    private Integer distanceKm;
    private Integer durationMin;
    private String confirmedByName;
    private Instant confirmedAt;
    private Instant supersededAt;
    private String changeReason;
    private List<RouteStopResponse> stops;
    private List<RouteLegResponse> legs;
}
