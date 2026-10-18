package com.equifreight.model.fleet;

import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

/** One stall of a new vehicle; a missing stall type means STANDARD, a missing number 0, a missing flag false. */
@Builder
public record CreateVehicleStallRequest(
        Short positionNo,
        StallType stallType,
        Short rowNo,
        @NotNull StallSide side,
        Boolean nearRamp) {

    public CreateVehicleStallRequest {
        positionNo = positionNo == null ? 0 : positionNo;
        stallType = stallType == null ? StallType.STANDARD : stallType;
        rowNo = rowNo == null ? 0 : rowNo;
        nearRamp = nearRamp != null && nearRamp;
    }
}
