package com.equifreight.model.job;

import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
public class LoadPlanStallResponse {
    private UUID stallId;
    private short positionNo;
    private StallType stallType;
    private short rowNo;
    private StallSide side;
    private boolean nearRamp;
    private JobHorseResponse horse;
    private String issue;
}
