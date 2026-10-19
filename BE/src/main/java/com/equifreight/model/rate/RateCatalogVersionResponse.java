package com.equifreight.model.rate;

import com.equifreight.entity.enums.CatalogStatus;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateCatalogVersionResponse {
    private UUID id;
    private int versionNo;
    private CatalogStatus status;
    private Instant publishedAt;
    private String publishedByName;
    private String changeNote;
    private int changesCount;
    private int quotesPinnedCount;
}
