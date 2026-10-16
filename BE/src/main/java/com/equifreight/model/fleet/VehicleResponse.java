package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleKind;
import com.equifreight.entity.enums.VehicleStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
public class VehicleResponse {
    private UUID id;
    private String code;
    private VehicleKind kind;
    private int payloadKg;
    private VehicleStatus status;
    private int stallCount;
    private List<VehicleStallResponse> stalls;
}
