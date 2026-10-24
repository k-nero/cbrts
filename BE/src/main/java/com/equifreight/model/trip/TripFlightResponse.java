package com.equifreight.model.trip;

import com.equifreight.model.job.FlightAllocationResponse;
import java.time.Instant;
import java.util.List;

/**
 * The trip's flight as its people follow it (US-F3-15): what everyone shares, and the consignments: every job's for
 * staff and the crew, only their own for the customer.
 */
public record TripFlightResponse(
        String airline,
        String flightNo,
        String aircraftType,
        Instant scheduledDepartureAt,
        Instant scheduledArrivalAt,
        Instant estimatedDepartureAt,
        Instant estimatedArrivalAt,
        List<FlightAllocationResponse> consignments) {}
