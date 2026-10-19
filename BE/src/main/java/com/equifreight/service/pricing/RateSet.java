package com.equifreight.service.pricing;

import com.equifreight.entity.enums.RatePolicyKey;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The rates of one pinned catalog version that apply to one corridor (spec §4.1). */
public record RateSet(
        int versionNo,
        List<ClassRow> classes,
        List<RateRow> lines,
        List<BreakRow> breaks,
        Map<RatePolicyKey, BigDecimal> policies) {

    /**
     * Merges a corridor's rows with the every-corridor rows: a corridor line replaces an every-corridor line with the
     * same code, and a corridor's own breaks replace the global ones. Lines come out in group, then code order.
     */
    public static RateSet of(
            int versionNo,
            List<ClassRow> classes,
            List<RateRow> corridorLines,
            List<RateRow> globalLines,
            List<BreakRow> corridorBreaks,
            List<BreakRow> globalBreaks,
            Map<RatePolicyKey, BigDecimal> policies) {
        Map<String, RateRow> byCode = new LinkedHashMap<>();
        globalLines.forEach(l -> byCode.put(l.code(), l));
        corridorLines.forEach(l -> byCode.put(l.code(), l));
        List<RateRow> lines = new ArrayList<>(byCode.values());
        lines.sort(Comparator.comparing(RateRow::group).thenComparing(RateRow::code));
        List<BreakRow> breaks = new ArrayList<>(corridorBreaks.isEmpty() ? globalBreaks : corridorBreaks);
        breaks.sort(Comparator.comparingInt(BreakRow::minHorses));
        return new RateSet(
                versionNo, List.copyOf(classes), List.copyOf(lines), List.copyOf(breaks), Map.copyOf(policies));
    }
}
