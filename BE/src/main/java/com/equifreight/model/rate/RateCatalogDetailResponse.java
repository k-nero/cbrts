package com.equifreight.model.rate;

import com.equifreight.entity.enums.CatalogStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateCatalogDetailResponse {
    private UUID versionId;
    private int versionNo;
    private CatalogStatus status;
    private Instant publishedAt;
    private String publishedAtDisplay;
    private String changeNote;
    private int changesCount;
    private int quotesPinnedCount;
    private RateCorridorSummaryResponse corridor;
    private List<RateServiceClassResponse> serviceClasses;
    private List<RateVolumeBreakResponse> volumeBreaks;
    private List<RatePolicyItemResponse> policies;
    private List<RateLineResponse> catalogLines;
    private boolean hasDraft;
    private Integer draftVersionNo;
    private String draftChangesSummary;
    private UUID draftVersionId;
}
