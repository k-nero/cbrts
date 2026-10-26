package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleKind;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A new vehicle with its stalls, the city it is based in, the countries it holds permits for and the road corridors it works
 * (US-F7-01). A missing list is empty, a missing payload 0 (refused by {@code @Positive}).
 */
@Builder
public record CreateVehicleRequest(
        @NotBlank String code,
        @NotNull VehicleKind kind,
        @Positive Integer payloadKg,
        @Valid List<CreateVehicleStallRequest> stalls,
        /* The city it is based in (US-F7-03); its home country follows from the city's places. */
        String homeCity,
        List<UUID> permittedCountryIds,
        List<UUID> operatingCorridorIds) {
    public CreateVehicleRequest {
        payloadKg = payloadKg == null ? 0 : payloadKg;
        stalls = stalls == null ? List.of() : stalls;
        permittedCountryIds = permittedCountryIds == null ? List.of() : permittedCountryIds;
        operatingCorridorIds = operatingCorridorIds == null ? List.of() : operatingCorridorIds;
    }
}
