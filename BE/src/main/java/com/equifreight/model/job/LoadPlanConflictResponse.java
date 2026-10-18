package com.equifreight.model.job;

import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class LoadPlanConflictResponse {
    private UUID horseId;
    private String horseName;
    private UUID stallId;
    private Short stallPositionNo;
    private String rule;
    private String description;
}
