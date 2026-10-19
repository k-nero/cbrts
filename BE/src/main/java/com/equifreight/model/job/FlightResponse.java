package com.equifreight.model.job;

import com.equifreight.entity.enums.ServiceClass;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record FlightResponse(
        UUID id,
        String airline,
        String flightNo,
        String airWaybill,
        String aircraftType,
        Short stallPositions,
        ServiceClass serviceClass,
        Instant scheduledDepartureAt,
        Instant scheduledArrivalAt,
        Instant estimatedDepartureAt,
        Instant estimatedArrivalAt) {}
