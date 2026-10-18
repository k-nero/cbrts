package com.equifreight.model.job;

import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import java.util.UUID;
import lombok.Builder;

@Builder
public record LoadPlanStallResponse(
        UUID stallId,
        short positionNo,
        StallType stallType,
        short rowNo,
        StallSide side,
        boolean nearRamp,
        JobHorseResponse horse,
        String issue) {}
