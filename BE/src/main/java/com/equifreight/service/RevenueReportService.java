package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Incident;
import com.equifreight.entity.Invoice;
import com.equifreight.entity.InvoiceLine;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.report.RevenueReportResponse;
import com.equifreight.model.report.RevenueReportResponse.CorridorOption;
import com.equifreight.model.report.RevenueReportResponse.CorridorRow;
import com.equifreight.model.report.RevenueReportResponse.JobRow;
import com.equifreight.model.report.RevenueReportResponse.Month;
import com.equifreight.model.report.RevenueReportResponse.Totals;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.InvoiceRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Revenue and operating cost by period and corridor (US-R-02, docs/reports-design.md). A job counts once it is
 * settled, in the month (business time zone) its final invoice was issued:
 *
 * <ul>
 *   <li>revenue is what it was invoiced: the deposit and the final invoice, after any discount or credit;
 *   <li>direct cost is its priced lines A–H as settled (the final invoice's quoted and actual lines that settle a
 *       quotation line) plus the extra cost of each incident option decided on it, whoever paid for it.
 * </ul>
 *
 * The margin is what is left: the surcharges, contingency and service fee, and the incident costs charged on.
 */
@Service
public class RevenueReportService {

    static final String CURRENCY = "USD";
    /** The longest period one report covers. */
    static final int MAX_MONTHS = 24;
    /** The period when none is given: the last six months, this one included. */
    static final int DEFAULT_MONTHS = 6;

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final InvoiceRepository invoices;
    private final IncidentRepository incidents;
    private final CorridorRepository corridors;
    private final Clock clock;

    public RevenueReportService(
            InvoiceRepository invoices, IncidentRepository incidents, CorridorRepository corridors, Clock clock) {
        this.invoices = invoices;
        this.incidents = incidents;
        this.corridors = corridors;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public RevenueReportResponse report(String fromMonth, String toMonth, UUID corridorId) {
        YearMonth to = toMonth == null || toMonth.isBlank()
                ? YearMonth.from(LocalDate.now(clock.withZone(BusinessTime.ZONE)))
                : month(toMonth, "to");
        YearMonth from = fromMonth == null || fromMonth.isBlank()
                ? to.minusMonths(DEFAULT_MONTHS - 1)
                : month(fromMonth, "from");
        if (from.isAfter(to)) {
            throw new BusinessException("The period starts after it ends: " + from + " is after " + to);
        }
        long span = ChronoUnit.MONTHS.between(from, to) + 1;
        if (span > MAX_MONTHS) {
            throw new BusinessException(
                    "A report covers up to " + MAX_MONTHS + " months; " + from + " to " + to + " is " + span);
        }
        Instant start = from.atDay(1).atStartOfDay(BusinessTime.ZONE).toInstant();
        Instant end = to.plusMonths(1).atDay(1).atStartOfDay(BusinessTime.ZONE).toInstant();

        List<Invoice> finals = invoices.findFinalIssuedBetween(start, end, corridorId);
        List<UUID> quotationIds =
                finals.stream().map(i -> i.getQuotation().getId()).distinct().toList();
        Map<UUID, BigDecimal> deposits = new HashMap<>();
        if (!quotationIds.isEmpty()) {
            invoices.findByQuotation_IdInAndKindAndStatusNot(quotationIds, InvoiceKind.DEPOSIT, InvoiceStatus.VOID)
                    .forEach(d -> deposits.merge(d.getQuotation().getId(), d.getTotal(), BigDecimal::add));
        }
        List<UUID> jobIds =
                finals.stream().map(i -> i.getJob().getId()).distinct().toList();
        Map<UUID, BigDecimal> incidentCosts = new HashMap<>();
        if (!jobIds.isEmpty()) {
            for (Incident incident : incidents.findDecidedForJobs(jobIds)) {
                BigDecimal cost = incident.getDecidedOption().getExtraCost();
                if (cost != null) incidentCosts.merge(incident.getJob().getId(), cost, BigDecimal::add);
            }
        }

        Map<YearMonth, int[]> monthJobs = new HashMap<>();
        Map<YearMonth, BigDecimal[]> monthSums = new LinkedHashMap<>();
        for (YearMonth m = from; !m.isAfter(to); m = m.plusMonths(1)) {
            monthSums.put(m, new BigDecimal[] {BigDecimal.ZERO, BigDecimal.ZERO});
            monthJobs.put(m, new int[] {0});
        }
        Map<UUID, CorridorAcc> byCorridor = new LinkedHashMap<>();
        List<JobRow> rows = new ArrayList<>();
        BigDecimal revenueTotal = BigDecimal.ZERO;
        BigDecimal costTotal = BigDecimal.ZERO;
        for (Invoice fin : finals) {
            TransportJob job = fin.getJob();
            YearMonth m = YearMonth.from(fin.getIssuedAt().atZone(BusinessTime.ZONE));
            BigDecimal revenue =
                    fin.getTotal().add(deposits.getOrDefault(fin.getQuotation().getId(), BigDecimal.ZERO));
            BigDecimal lineCost = fin.getLines().stream()
                    .filter(l -> l.getQuotationLine() != null)
                    .map(InvoiceLine::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal incidentCost = incidentCosts.getOrDefault(job.getId(), BigDecimal.ZERO);
            BigDecimal cost = lineCost.add(incidentCost);
            Corridor corridor = job.getRequest().getCorridor();
            String label = label(corridor);

            BigDecimal[] sums = monthSums.get(m);
            sums[0] = sums[0].add(revenue);
            sums[1] = sums[1].add(cost);
            monthJobs.get(m)[0]++;
            UUID key = corridor == null ? null : corridor.getId();
            byCorridor.computeIfAbsent(key, k -> new CorridorAcc(k, label)).add(revenue, cost);
            revenueTotal = revenueTotal.add(revenue);
            costTotal = costTotal.add(cost);
            rows.add(JobRow.builder()
                    .month(m.toString())
                    .jobCode(job.getCode())
                    .club(fin.getClub().getName())
                    .corridor(label)
                    .finalInvoice(fin.getCode())
                    .revenue(revenue)
                    .lineCost(lineCost)
                    .incidentCost(incidentCost)
                    .cost(cost)
                    .margin(revenue.subtract(cost))
                    .build());
        }
        List<Month> monthList = monthSums.entrySet().stream()
                .map(e -> Month.builder()
                        .month(e.getKey().toString())
                        .jobs(monthJobs.get(e.getKey())[0])
                        .revenue(e.getValue()[0])
                        .cost(e.getValue()[1])
                        .build())
                .toList();
        return RevenueReportResponse.builder()
                .from(from.toString())
                .to(to.toString())
                .corridorId(corridorId)
                .currency(CURRENCY)
                .totals(Totals.builder()
                        .jobs(rows.size())
                        .revenue(revenueTotal)
                        .cost(costTotal)
                        .margin(revenueTotal.subtract(costTotal))
                        .marginPct(pct(revenueTotal.subtract(costTotal), revenueTotal))
                        .build())
                .months(monthList)
                .corridors(byCorridor.values().stream()
                        .sorted(Comparator.comparing((CorridorAcc a) -> a.revenue)
                                .reversed())
                        .map(CorridorAcc::toRow)
                        .toList())
                .jobs(rows)
                .corridorOptions(corridors.findAllByOrderByCodeAsc().stream()
                        .map(c -> new CorridorOption(c.getId(), label(c)))
                        .toList())
                .build();
    }

    /** The report's job rows as CSV, with a header, for a spreadsheet. */
    @Transactional(readOnly = true)
    public String csv(String fromMonth, String toMonth, UUID corridorId) {
        RevenueReportResponse report = report(fromMonth, toMonth, corridorId);
        // The byte-order mark makes Excel read it as UTF-8, so "→" in a corridor stays an arrow.
        StringBuilder out = new StringBuilder(
                "\uFEFFMonth,Job,Club,Corridor,Final invoice,Revenue (USD),Line cost (USD),Incident cost (USD),"
                        + "Direct cost (USD),Margin (USD)\n");
        for (JobRow r : report.jobs()) {
            out.append(String.join(
                            ",",
                            r.month(),
                            cell(r.jobCode()),
                            cell(r.club()),
                            cell(r.corridor()),
                            cell(r.finalInvoice()),
                            amount(r.revenue()),
                            amount(r.lineCost()),
                            amount(r.incidentCost()),
                            amount(r.cost()),
                            amount(r.margin())))
                    .append('\n');
        }
        return out.toString();
    }

    /** An amount with its two decimals, "0.00" included. */
    private static String amount(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    /** "Ho Chi Minh City → Phnom Penh · road", or "No corridor" for a job without one. */
    static String label(Corridor c) {
        if (c == null) return "No corridor";
        return c.getOriginCity() + " → " + c.getDestinationCity() + " · "
                + c.getMode().name().toLowerCase(java.util.Locale.ROOT);
    }

    /** A CSV cell: quoted when it holds a comma, a quote or a line break; a leading formula sign is neutralised. */
    static String cell(String value) {
        if (value == null) return "";
        String v = value;
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0) v = "'" + v;
        if (v.contains(",") || v.contains("\"") || v.contains("\n")) v = "\"" + v.replace("\"", "\"\"") + "\"";
        return v;
    }

    private static YearMonth month(String value, String which) {
        try {
            return YearMonth.parse(value);
        } catch (DateTimeParseException e) {
            throw new BusinessException("The period's " + which + " month is YYYY-MM, such as 2026-10; got " + value);
        }
    }

    /** The margin as a share of revenue, one decimal; null without revenue. */
    static BigDecimal pct(BigDecimal margin, BigDecimal revenue) {
        if (revenue.signum() == 0) return null;
        return margin.multiply(HUNDRED).divide(revenue, 1, RoundingMode.HALF_UP);
    }

    private static final class CorridorAcc {
        private final UUID id;
        private final String label;
        private int jobs;
        private BigDecimal revenue = BigDecimal.ZERO;
        private BigDecimal cost = BigDecimal.ZERO;

        CorridorAcc(UUID id, String label) {
            this.id = id;
            this.label = label;
        }

        void add(BigDecimal r, BigDecimal c) {
            jobs++;
            revenue = revenue.add(r);
            cost = cost.add(c);
        }

        CorridorRow toRow() {
            return CorridorRow.builder()
                    .corridorId(id)
                    .label(label)
                    .jobs(jobs)
                    .revenue(revenue)
                    .cost(cost)
                    .marginPct(pct(revenue.subtract(cost), revenue))
                    .build();
        }
    }
}
