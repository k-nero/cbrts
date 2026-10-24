package com.equifreight.model.job;

import java.time.Instant;
import java.util.List;
import lombok.Builder;

/**
 * Whether a job can be closed and, once closed, how it ended (US-F6-04): the handover recorded and no incident open,
 * and whether the horses arrived on time.
 */
@Builder
public record JobClosingResponse(
        boolean closed,
        /** What stops the job closing now, in words; empty when it can close. */
        List<String> blockers,
        Instant closedAt,
        String closedByName,
        Boolean onTime,
        Integer lateMinutes,
        /** What on time was measured against: "the arrival window" or "the planned arrival". */
        String measuredAgainst) {}
