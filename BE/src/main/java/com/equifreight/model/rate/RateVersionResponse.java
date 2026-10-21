package com.equifreight.model.rate;

import com.equifreight.entity.enums.CatalogStatus;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

/** One rate catalog version in the Versions panel. */
@Builder
public record RateVersionResponse(
        UUID id,
        int versionNo,
        CatalogStatus status,
        Instant publishedAt,
        String publishedBy,
        String changeNote,
        long quotationsPinned,
        String lastEditedBy,
        Instant updatedAt) {}
