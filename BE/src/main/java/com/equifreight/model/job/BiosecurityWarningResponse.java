package com.equifreight.model.job;

import java.util.List;
import lombok.Builder;

/**
 * A biosecurity warning on a shared trip (US-F3-12): it doesn't block, but the coordinator accepts it before the jobs
 * are combined or the trip's load is confirmed. The key changes when what the warning says changes.
 */
@Builder
public record BiosecurityWarningResponse(
        String key,
        /** ISOLATION, HEALTH_TESTS or HEALTH_DOCUMENTS. */
        String kind,
        List<String> jobCodes,
        List<String> horses,
        String message,
        boolean accepted) {}
