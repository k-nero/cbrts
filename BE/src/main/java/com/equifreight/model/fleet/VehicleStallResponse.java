package com.equifreight.model.fleet;

import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import java.util.UUID;
import lombok.Builder;

@Builder
public record VehicleStallResponse(
        UUID id, short positionNo, StallType stallType, short rowNo, StallSide side, boolean nearRamp, short widthIn) {}
