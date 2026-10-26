package com.equifreight.model.fleet;

import java.util.UUID;
import lombok.Builder;

/** One of a vehicle's operating corridors: "RD HCM → BKK". */
@Builder
public record VehicleCorridorResponse(UUID id, String code) {}
