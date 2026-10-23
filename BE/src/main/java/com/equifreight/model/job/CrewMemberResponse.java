package com.equifreight.model.job;

import com.equifreight.entity.enums.CrewRole;
import java.util.UUID;
import lombok.Builder;

@Builder
/** One crew member and the trailer they travel with. */
public record CrewMemberResponse(
        UUID userId,
        String name,
        String staffCode,
        String email,
        CrewRole crewRole,
        UUID tripVehicleId,
        String vehicleCode) {}
