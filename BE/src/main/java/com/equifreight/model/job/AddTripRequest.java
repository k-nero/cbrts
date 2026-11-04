package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Adds a trip on the catalog corridor {@code corridorId} to the end of a job's journey (US-F3-21). With
 * {@code quarantinePlaceId}, the trip ends at that quarantine station, where the job has a quarantine scheduled in the
 * city it ends in, and the next trip collects the horses there (US-F3-22).
 */
public record AddTripRequest(@NotNull UUID corridorId, UUID quarantinePlaceId) {}
