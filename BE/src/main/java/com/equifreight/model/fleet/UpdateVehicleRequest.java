package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleStatus;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A change to a vehicle. A null field leaves it as it is; a list replaces the whole set (US-F7-01).
 */
@Builder
public record UpdateVehicleRequest(
        Integer payloadKg,
        VehicleStatus status,
        UUID homeCountryId,
        List<UUID> permittedCountryIds,
        List<UUID> operatingCorridorIds) {}
