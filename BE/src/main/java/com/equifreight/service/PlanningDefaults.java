package com.equifreight.service;

import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.RatePolicyRepository;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * How a journey drafted from its quote is timed (US-F3-22): the planning settings of the published rate catalog, each
 * falling back to its default when the version doesn't set it.
 */
@Service
public class PlanningDefaults {

    /** A setting's whole-number bounds and unit, as the catalog editor refuses them. */
    public record Bounds(int min, int max, String unit, int fallback) {}

    public static final Map<RatePolicyKey, Bounds> BOUNDS = Map.of(
            RatePolicyKey.PLAN_START_HOUR, new Bounds(0, 23, "o'clock", 6),
            RatePolicyKey.PLAN_SPEED_KMH, new Bounds(10, 120, "km/h", 60),
            RatePolicyKey.PLAN_WELFARE_EVERY_HOURS, new Bounds(1, 24, "hours", 4),
            RatePolicyKey.PLAN_WELFARE_STOP_MIN, new Bounds(0, 600, "minutes", 45),
            RatePolicyKey.PLAN_BORDER_STOP_MIN, new Bounds(0, 1440, "minutes", 90),
            RatePolicyKey.PLAN_AIRPORT_BEFORE_HOURS, new Bounds(0, 72, "hours", 4),
            RatePolicyKey.PLAN_AIRPORT_AFTER_HOURS, new Bounds(0, 240, "hours", 3));

    /** The settings a draft is timed with. */
    public record Planning(
            int startHour,
            int speedKmh,
            int welfareEveryHours,
            int welfareStopMin,
            int borderStopMin,
            int airportBeforeHours,
            int airportAfterHours) {}

    private final RateCatalogVersionRepository versions;
    private final RatePolicyRepository policies;

    public PlanningDefaults(RateCatalogVersionRepository versions, RatePolicyRepository policies) {
        this.versions = versions;
        this.policies = policies;
    }

    /** The published catalog's settings, the defaults for any it doesn't set. */
    @Transactional(readOnly = true)
    public Planning current() {
        Map<RatePolicyKey, Integer> set = new EnumMap<>(RatePolicyKey.class);
        versions
                .findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED)
                .map(v -> policies.findByVersionId(v.getId()))
                .orElse(List.of())
                .stream()
                .filter(p -> BOUNDS.containsKey(p.getKey()))
                .forEach(p -> set.put(p.getKey(), p.getValue().intValue()));
        return of(set);
    }

    /** {@code set}'s settings, the defaults for any it leaves out. */
    public static Planning of(Map<RatePolicyKey, Integer> set) {
        Function<RatePolicyKey, Integer> v =
                k -> set.getOrDefault(k, BOUNDS.get(k).fallback());
        return new Planning(
                v.apply(RatePolicyKey.PLAN_START_HOUR),
                v.apply(RatePolicyKey.PLAN_SPEED_KMH),
                v.apply(RatePolicyKey.PLAN_WELFARE_EVERY_HOURS),
                v.apply(RatePolicyKey.PLAN_WELFARE_STOP_MIN),
                v.apply(RatePolicyKey.PLAN_BORDER_STOP_MIN),
                v.apply(RatePolicyKey.PLAN_AIRPORT_BEFORE_HOURS),
                v.apply(RatePolicyKey.PLAN_AIRPORT_AFTER_HOURS));
    }
}
