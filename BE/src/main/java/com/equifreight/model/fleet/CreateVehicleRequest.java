package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleKind;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;
import lombok.Builder;

/** A new vehicle with its stalls; a missing stall list is empty, a missing payload 0 (refused by {@code @Positive}). */
@Builder
public record CreateVehicleRequest(
        @NotBlank String code,
        @NotNull VehicleKind kind,
        @Positive Integer payloadKg,
        @Valid List<CreateVehicleStallRequest> stalls) {

    public CreateVehicleRequest {
        payloadKg = payloadKg == null ? 0 : payloadKg;
        stalls = stalls == null ? List.of() : stalls;
    }
}
