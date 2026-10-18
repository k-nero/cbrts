package com.equifreight.model.job;

import com.equifreight.entity.enums.TransportMode;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class RouteLegResponse {
    private UUID id;
    private short seq;
    private UUID fromStopId;
    private UUID toStopId;
    private TransportMode mode;
    private UUID vehicleId;
    private String vehicleCode;
    private Integer distanceKm;
    private Integer plannedMin;
    private FlightResponse flight;
}
