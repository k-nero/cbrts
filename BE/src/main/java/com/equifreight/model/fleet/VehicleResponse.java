package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleKind;
import com.equifreight.entity.enums.VehicleStatus;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record VehicleResponse(
        UUID id,
        String code,
        VehicleKind kind,
        int payloadKg,
        VehicleStatus status,
        int stallCount,
        List<VehicleStallResponse> stalls) {}
