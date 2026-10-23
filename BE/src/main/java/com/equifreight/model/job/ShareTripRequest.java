package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/**
 * The job to put on this job's trip (US-F3-11), with the keys of the biosecurity warnings the coordinator accepted
 * (US-F3-12).
 */
public record ShareTripRequest(@NotNull UUID jobId, List<String> acceptedWarnings) {}
