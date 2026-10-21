package com.equifreight.model.rate;

import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.RatePolicyKey;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Builder;

/** One corridor's rates in one catalog version (spec §5.3). volumeBreaksScope is CORRIDOR or GLOBAL. */
@Builder
public record RateCorridorView(
        UUID versionId,
        int versionNo,
        CatalogStatus status,
        RateCorridorResponse corridor,
        List<ServiceClassResponse> serviceClasses,
        List<RateLineResponse> lines,
        List<VolumeBreakResponse> volumeBreaks,
        String volumeBreaksScope,
        Map<RatePolicyKey, BigDecimal> policies,
        List<FeeBandResponse> feeBands,
        List<MissingRateResponse> missing) {}
