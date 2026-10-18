package com.equifreight.model.clearance;

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
public class RegulationVersionResponse {
    private UUID id;
    private UUID catalogId;
    private int versionNo;
    private CatalogStatus status;
    private Instant publishedAt;
    private String publishedByName;
    private short leadTimeDays;
    private short quarantineMinDays;
    private short arrivalBufferDays;
    private List<RegulationRuleResponse> rules;
}
