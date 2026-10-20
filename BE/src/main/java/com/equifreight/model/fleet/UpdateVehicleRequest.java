package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleStatus;
import lombok.Builder;

@Builder
public record UpdateVehicleRequest(Integer payloadKg, VehicleStatus status) {}
