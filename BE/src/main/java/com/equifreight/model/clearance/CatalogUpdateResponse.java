package com.equifreight.model.clearance;

import com.equifreight.entity.enums.RegulationRole;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A newer published version of a catalog the job is pinned to, and what moving onto it would change. The job keeps
 * its pinned version until the specialist moves it.
 */
@Builder
public record CatalogUpdateResponse(
        RegulationRole role,
        String country,
        UUID pinnedVersionId,
        int pinnedVersionNo,
        UUID versionId,
        int versionNo,
        Instant publishedAt,
        /** Documents the newer version asks for that the pinned one doesn't. */
        List<String> added,
        /** "EIA (Coggins): 60 d before departure → 45 d before departure". */
        List<String> changed,
        /** Documents the newer version no longer lists. */
        List<String> removed) {}
