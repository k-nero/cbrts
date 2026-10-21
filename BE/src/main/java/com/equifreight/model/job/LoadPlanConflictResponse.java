package com.equifreight.model.job;

import java.util.UUID;
import lombok.Builder;

@Builder
public record LoadPlanConflictResponse(
        UUID horseId, String horseName, UUID stallId, Short stallPositionNo, String rule, String description) {}
