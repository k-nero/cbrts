package com.equifreight.model.job;

import java.time.LocalDate;
import java.util.List;
import lombok.Builder;

/**
 * The trip after a job joined it (US-F3-11): the days every job on it can leave, for the coordinator to plan the
 * departure in, and the jobs it now carries.
 */
@Builder
public record ShareTripResponse(
        String tripCode, LocalDate departFrom, LocalDate departTo, List<TripJobResponse> jobs) {}
