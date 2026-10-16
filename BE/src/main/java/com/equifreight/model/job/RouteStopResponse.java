package com.equifreight.model.job;

import com.equifreight.entity.enums.RouteStopKind;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
public class RouteStopResponse {
    private UUID id;
    private short seq;
    private RouteStopKind kind;
    private UUID placeId;
    private String placeName;
    private UUID borderCrossingId;
    private String borderCrossingName;
    private Instant plannedAt;
    private Short plannedStayMin;
    private String details;
}
