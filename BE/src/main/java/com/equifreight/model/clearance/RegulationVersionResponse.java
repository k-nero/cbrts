package com.equifreight.model.clearance;

import com.equifreight.entity.enums.CatalogStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A regulation catalog version. The catalog list leaves {@code rules} empty; the version detail fills it, with
 * {@code changesCount} counting the draft's new, changed and removed rules against the published version.
 */
@Builder
public record RegulationVersionResponse(
        UUID id,
        UUID catalogId,
        int versionNo,
        CatalogStatus status,
        Instant publishedAt,
        String publishedByName,
        short leadTimeDays,
        short domesticLeadTimeDays,
        short quarantineMinDays,
        short arrivalBufferDays,
        List<RegulationRuleResponse> rules,
        int pinnedJobsCount,
        int changesCount) {}
