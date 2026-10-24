package com.equifreight.model.report;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * Revenue and direct cost by month and corridor (US-R-02). A job counts in the month its final invoice was issued:
 * revenue is what it was invoiced (the deposit and the final invoice), cost its priced lines as settled plus what its
 * incidents cost.
 */
@Builder
public record RevenueReportResponse(
        /** YYYY-MM, both inclusive. */
        String from,
        String to,
        UUID corridorId,
        String currency,
        Totals totals,
        /** Every month of the period, oldest first, empty months included. */
        List<Month> months,
        /** The corridors with work in the period, most revenue first. */
        List<CorridorRow> corridors,
        /** One row per job, as exported. */
        List<JobRow> jobs,
        /** Every corridor, for the filter. */
        List<CorridorOption> corridorOptions) {

    @Builder
    public record Totals(int jobs, BigDecimal revenue, BigDecimal cost, BigDecimal margin, BigDecimal marginPct) {}

    @Builder
    public record Month(String month, int jobs, BigDecimal revenue, BigDecimal cost) {}

    @Builder
    public record CorridorRow(
            UUID corridorId, String label, int jobs, BigDecimal revenue, BigDecimal cost, BigDecimal marginPct) {}

    @Builder
    public record JobRow(
            String month,
            String jobCode,
            String club,
            String corridor,
            String finalInvoice,
            BigDecimal revenue,
            BigDecimal lineCost,
            BigDecimal incidentCost,
            BigDecimal cost,
            BigDecimal margin) {}

    @Builder
    public record CorridorOption(UUID id, String label) {}
}
