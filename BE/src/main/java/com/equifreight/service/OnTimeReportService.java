package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Incident;
import com.equifreight.entity.TransportJob;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.report.OnTimeReportResponse;
import com.equifreight.model.report.OnTimeReportResponse.Bucket;
import com.equifreight.model.report.OnTimeReportResponse.CorridorRow;
import com.equifreight.model.report.OnTimeReportResponse.LateJob;
import com.equifreight.model.report.OnTimeReportResponse.Totals;
import com.equifreight.model.report.RevenueReportResponse.CorridorOption;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.TransportJobRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The on-time delivery rate (US-R-03, docs/reports-design.md). Of the jobs delivered in a period, the share delivered
 * by when they were due: the arrival window's close (less a stopped clock), or the planned arrival plus 30 minutes'
 * tolerance ({@link LateArrival}, the rule closing a job records too). By ISO week or month in Indochina Time, and by
 * corridor, with the late jobs listed.
 */
@Service
public class OnTimeReportService {

    /** The service target the chart draws. */
    static final BigDecimal TARGET = new BigDecimal("95");
    /** The longest period one report covers. */
    static final int MAX_DAYS = 366;

    public enum By {
        WEEK,
        MONTH
    }

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final TransportJobRepository jobs;
    private final IncidentRepository incidents;
    private final CorridorRepository corridors;
    private final Clock clock;

    public OnTimeReportService(
            TransportJobRepository jobs, IncidentRepository incidents, CorridorRepository corridors, Clock clock) {
        this.jobs = jobs;
        this.incidents = incidents;
        this.corridors = corridors;
        this.clock = clock;
    }

    /**
     * From {@code from} to {@code to}, both inclusive; by default the last 8 weeks by week (this week included). A
     * week starts on Monday.
     */
    @Transactional(readOnly = true)
    public OnTimeReportResponse report(LocalDate from, LocalDate to, By by, UUID corridorId) {
        By step = by == null ? By.WEEK : by;
        LocalDate today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
        LocalDate end = to == null ? today : to;
        LocalDate start = from == null
                ? end.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(7)
                : from;
        if (start.isAfter(end)) {
            throw new BusinessException("The period starts after it ends: " + start + " is after " + end);
        }
        if (ChronoUnit.DAYS.between(start, end) + 1 > MAX_DAYS) {
            throw new BusinessException("A report covers up to " + MAX_DAYS + " days; " + start + " to " + end + " is "
                    + (ChronoUnit.DAYS.between(start, end) + 1));
        }
        List<TransportJob> delivered = jobs.findDeliveredBetween(
                start.atStartOfDay(BusinessTime.ZONE).toInstant(),
                end.plusDays(1).atStartOfDay(BusinessTime.ZONE).toInstant(),
                corridorId);
        Map<UUID, List<Incident>> stops = new HashMap<>();
        List<UUID> windowed = delivered.stream()
                .filter(j -> j.getWindowEnd() != null)
                .map(TransportJob::getId)
                .toList();
        if (!windowed.isEmpty()) {
            incidents
                    .findByJob_IdInAndStopsClockTrue(windowed)
                    .forEach(i -> stops.computeIfAbsent(i.getJob().getId(), k -> new ArrayList<>())
                            .add(i));
        }

        Map<LocalDate, int[]> buckets = new LinkedHashMap<>();
        for (LocalDate b = bucketOf(start, step); !b.isAfter(end); b = next(b, step)) buckets.put(b, new int[2]);
        Map<UUID, int[]> byCorridor = new LinkedHashMap<>();
        Map<UUID, String> corridorLabels = new HashMap<>();
        List<LateJob> late = new ArrayList<>();
        int lateCount = 0;
        for (TransportJob job : delivered) {
            Integer minutes = LateArrival.of(job, job.getDeliveredAt(), stops.getOrDefault(job.getId(), List.of()));
            // A job with no due time to measure against (no window, no planned arrival) counts as on time.
            boolean isLate = minutes != null && minutes > 0;
            LocalDate day = LocalDate.ofInstant(job.getDeliveredAt(), BusinessTime.ZONE);
            int[] bucket = buckets.computeIfAbsent(bucketOf(day, step), k -> new int[2]);
            bucket[0]++;
            Corridor corridor = job.getRequest().getCorridor();
            UUID key = corridor == null ? null : corridor.getId();
            corridorLabels.put(key, RevenueReportService.label(corridor));
            int[] row = byCorridor.computeIfAbsent(key, k -> new int[2]);
            row[0]++;
            if (isLate) {
                lateCount++;
                bucket[1]++;
                row[1]++;
                late.add(LateJob.builder()
                        .jobId(job.getId())
                        .jobCode(job.getCode())
                        .club(job.getRequest().getClub().getName())
                        .corridor(RevenueReportService.label(corridor))
                        .deliveredAt(job.getDeliveredAt())
                        .due(LateArrival.dueOf(job))
                        .lateMinutes(minutes)
                        .measuredAgainst(LateArrival.measuredAgainst(job))
                        .build());
            }
        }
        late.sort(Comparator.comparing(LateJob::deliveredAt).reversed());
        return OnTimeReportResponse.builder()
                .from(start)
                .to(end)
                .by(step.name())
                .target(TARGET)
                .totals(Totals.builder()
                        .delivered(delivered.size())
                        .late(lateCount)
                        .rate(rate(delivered.size(), lateCount))
                        .build())
                .buckets(buckets.entrySet().stream()
                        .map(e -> Bucket.builder()
                                .label(label(e.getKey(), step))
                                .start(e.getKey())
                                .delivered(e.getValue()[0])
                                .late(e.getValue()[1])
                                .rate(rate(e.getValue()[0], e.getValue()[1]))
                                .build())
                        .toList())
                .corridors(byCorridor.entrySet().stream()
                        .map(e -> CorridorRow.builder()
                                .corridorId(e.getKey())
                                .label(corridorLabels.get(e.getKey()))
                                .delivered(e.getValue()[0])
                                .late(e.getValue()[1])
                                .rate(rate(e.getValue()[0], e.getValue()[1]))
                                .build())
                        .sorted(Comparator.comparing(CorridorRow::rate))
                        .toList())
                .lateJobs(late)
                .corridorOptions(corridors.findAllByOrderByCodeAsc().stream()
                        .map(c -> new CorridorOption(c.getId(), RevenueReportService.label(c)))
                        .toList())
                .build();
    }

    /** The share delivered on time, one decimal; null when nothing was delivered. */
    static BigDecimal rate(int delivered, int late) {
        if (delivered == 0) return null;
        return BigDecimal.valueOf(delivered - late)
                .multiply(HUNDRED)
                .divide(BigDecimal.valueOf(delivered), 1, RoundingMode.HALF_UP);
    }

    private static LocalDate bucketOf(LocalDate day, By by) {
        return by == By.WEEK ? day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) : day.withDayOfMonth(1);
    }

    private static LocalDate next(LocalDate bucket, By by) {
        return by == By.WEEK ? bucket.plusWeeks(1) : bucket.plusMonths(1);
    }

    /** "W43" for an ISO week, "Oct" for a month. */
    private static String label(LocalDate start, By by) {
        return by == By.WEEK
                ? "W" + start.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
                : start.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, Locale.ENGLISH);
    }
}
