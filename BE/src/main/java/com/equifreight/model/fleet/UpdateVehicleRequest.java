package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateVehicleRequest {
    private Integer payloadKg;
    private VehicleStatus status;
}
