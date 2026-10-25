package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Continues a job's journey on another trip (US-F3-16): at the stop numbered {@code stopSeq} on the route of its trip
 * {@code tripId} (the job's current trip when left out), on a new trip of the catalog corridor {@code corridorId}.
 */
public record ContinueTripRequest(
        UUID tripId, @NotNull Short stopSeq, @NotNull UUID corridorId) {}
