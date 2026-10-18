package com.equifreight.model.clearance;

import com.equifreight.entity.enums.CatalogStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder(toBuilder = true)
public record RegulationVersionResponse(
        UUID id,
        UUID catalogId,
        int versionNo,
        CatalogStatus status,
        Instant publishedAt,
        String publishedByName,
        short leadTimeDays,
        short quarantineMinDays,
        short arrivalBufferDays,
        List<RegulationRuleResponse> rules) {}
