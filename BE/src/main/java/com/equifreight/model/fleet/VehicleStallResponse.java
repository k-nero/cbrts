package com.equifreight.model.fleet;

import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class VehicleStallResponse {
    private UUID id;
    private short positionNo;
    private StallType stallType;
    private short rowNo;
    private StallSide side;
    private boolean nearRamp;
}
