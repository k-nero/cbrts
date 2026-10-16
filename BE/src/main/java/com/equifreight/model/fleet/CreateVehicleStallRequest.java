package com.equifreight.model.fleet;

import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateVehicleStallRequest {
    private short positionNo;

    @NotNull
    private StallType stallType = StallType.STANDARD;

    private short rowNo;

    @NotNull
    private StallSide side;

    private boolean nearRamp;
}
