package com.equifreight.model.job;

import com.equifreight.entity.enums.ServiceClass;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
public class FlightResponse {
    private UUID id;
    private String airline;
    private String flightNo;
    private String airWaybill;
    private String aircraftType;
    private Short stallPositions;
    private ServiceClass serviceClass;
    private Instant scheduledDepartureAt;
    private Instant scheduledArrivalAt;
    private Instant estimatedDepartureAt;
    private Instant estimatedArrivalAt;
}
