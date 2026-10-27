package com.equifreight.model.job;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/**
 * The flight of a journey's flight trip (US-F3-21): its times become the times of the trip's airport stops. The stall
 * positions are how many the airline gives the trip; each job's own consignment is set on the Flight panel.
 */
public record SetFlightRequest(
        @NotBlank @Size(max = 80) String airline,
        @NotBlank @Size(max = 12) String flightNo,
        @Size(max = 40) String aircraftType,
        @Min(1) Short stallCapacity,
        Instant scheduledDepartureAt,
        Instant scheduledArrivalAt) {}
