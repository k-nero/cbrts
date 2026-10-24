package com.equifreight.model.job;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * The flight of an air leg: what every job on the trip shares, the stall positions the airline gives the trip, and
 * one consignment per job (US-F3-15).
 */
@Builder
public record FlightResponse(
        UUID id,
        String airline,
        String flightNo,
        String aircraftType,
        Short stallCapacity,
        Instant scheduledDepartureAt,
        Instant scheduledArrivalAt,
        Instant estimatedDepartureAt,
        Instant estimatedArrivalAt,
        List<FlightAllocationResponse> allocations) {}
