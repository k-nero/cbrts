package com.equifreight.service.pricing;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateFeeBand;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RatePolicy;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.RateVolumeBreak;
import com.equifreight.entity.enums.RatePolicyKey;
import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Every row of one rate catalog version, loaded once and cut per corridor. */
public record CatalogRows(
        RateCatalogVersion version,
        List<RateServiceClass> classes,
        List<RateLine> lines,
        List<RateVolumeBreak> breaks,
        List<RatePolicy> policies,
        List<RateFeeBand> feeBands) {

    /** The rate set that applies to one corridor: its own rows merged with the every-corridor rows. */
    public RateSet forCorridor(UUID corridorId) {
        List<ClassRow> classRows = classes.stream()
                .filter(c -> isCorridor(c.getCorridor(), corridorId))
                .map(c -> new ClassRow(c.getId(), c.getServiceClass(), c.getWidthPerHorseIn(), c.getPositionRate()))
                .toList();
        List<RateRow> corridorLines = lines.stream()
                .filter(l -> isCorridor(l.getCorridor(), corridorId))
                .map(l -> row(l, false))
                .toList();
        List<RateRow> globalLines = lines.stream()
                .filter(l -> l.getCorridor() == null)
                .map(l -> row(l, true))
                .toList();
        List<BreakRow> corridorBreaks = breaks.stream()
                .filter(b -> isCorridor(b.getCorridor(), corridorId))
                .map(CatalogRows::band)
                .toList();
        List<BreakRow> globalBreaks = breaks.stream()
                .filter(b -> b.getCorridor() == null)
                .map(CatalogRows::band)
                .toList();
        return RateSet.of(
                version.getVersionNo(),
                classRows,
                corridorLines,
                globalLines,
                corridorBreaks,
                globalBreaks,
                policyMap());
    }

    /** Whether the corridor has bands of its own (else the every-corridor bands apply). */
    public boolean hasOwnBreaks(UUID corridorId) {
        return breaks.stream().anyMatch(b -> isCorridor(b.getCorridor(), corridorId));
    }

    public Map<RatePolicyKey, BigDecimal> policyMap() {
        Map<RatePolicyKey, BigDecimal> map = new EnumMap<>(RatePolicyKey.class);
        policies.forEach(p -> map.put(p.getKey(), p.getValue()));
        return map;
    }

    private static boolean isCorridor(Corridor corridor, UUID corridorId) {
        return corridor != null && corridor.getId().equals(corridorId);
    }

    private static RateRow row(RateLine l, boolean everyCorridor) {
        return new RateRow(
                l.getId(),
                l.getCode(),
                l.getGroupCode(),
                l.getDescription(),
                l.getBasis(),
                l.getAppliesToSex(),
                l.getAppliesToTrailer(),
                l.getRate(),
                l.getMinCharge(),
                l.getDefaultQuantity(),
                l.getCertainty(),
                l.getEstimateNote(),
                everyCorridor,
                l.isCoveredByRoadLeg());
    }

    private static BreakRow band(RateVolumeBreak b) {
        return new BreakRow(
                b.getMinHorses(),
                b.getMaxHorses() == null ? null : b.getMaxHorses().intValue(),
                b.getDiscountPct());
    }
}
