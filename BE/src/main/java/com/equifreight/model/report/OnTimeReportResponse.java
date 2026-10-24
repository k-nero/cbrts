package com.equifreight.model.report;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * The on-time delivery rate (US-R-03): of the jobs delivered in a period, the share delivered by when they were due
 * (the window's close, or the planned arrival plus its tolerance), by week or month and by corridor, with the late
 * jobs.
 */
@Builder
public record OnTimeReportResponse(
        LocalDate from,
        LocalDate to,
        String by,
        /** The service target the chart draws: 95%. */
        BigDecimal target,
        Totals totals,
        /** Every week or month of the period, oldest first, empty ones included. */
        List<Bucket> buckets,
        /** The corridors with deliveries, the lowest rate first. */
        List<CorridorRow> corridors,
        /** The late jobs, the latest delivered first. */
        List<LateJob> lateJobs,
        List<RevenueReportResponse.CorridorOption> corridorOptions) {

    @Builder
    public record Totals(int delivered, int late, BigDecimal rate) {}

    /** {@code label} is "W43" or "Oct"; {@code rate} is null when nothing was delivered. */
    @Builder
    public record Bucket(String label, LocalDate start, int delivered, int late, BigDecimal rate) {}

    @Builder
    public record CorridorRow(UUID corridorId, String label, int delivered, int late, BigDecimal rate) {}

    @Builder
    public record LateJob(
            UUID jobId,
            String jobCode,
            String club,
            String corridor,
            Instant deliveredAt,
            Instant due,
            int lateMinutes,
            String measuredAgainst) {}
}
