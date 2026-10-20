package com.equifreight.model.job;

import com.equifreight.entity.enums.TransportMode;
import java.util.UUID;
import lombok.Builder;

@Builder
public record RouteLegResponse(
        UUID id,
        short seq,
        UUID fromStopId,
        UUID toStopId,
        TransportMode mode,
        UUID vehicleId,
        String vehicleCode,
        Integer distanceKm,
        Integer plannedMin,
        FlightResponse flight) {}
