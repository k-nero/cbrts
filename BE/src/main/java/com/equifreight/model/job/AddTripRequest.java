package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Adds a trip on the catalog corridor {@code corridorId} to the end of a job's journey (US-F3-21). */
public record AddTripRequest(@NotNull UUID corridorId) {}
