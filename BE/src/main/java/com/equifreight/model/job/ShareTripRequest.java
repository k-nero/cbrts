package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** The job to put on this job's trip (US-F3-11). */
public record ShareTripRequest(@NotNull UUID jobId) {}
