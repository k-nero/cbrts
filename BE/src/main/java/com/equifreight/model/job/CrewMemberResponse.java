package com.equifreight.model.job;

import com.equifreight.entity.enums.CrewRole;
import java.util.UUID;
import lombok.Builder;

@Builder
/** One crew member and the trailer they travel with, or the flight (US-F3-15). */
public record CrewMemberResponse(
        UUID userId,
        String name,
        String staffCode,
        String email,
        CrewRole crewRole,
        /** Null for the flight crew. */
        UUID tripVehicleId,
        String vehicleCode,
        /** True for the trip's flight crew: flying grooms and the flight vet. */
        boolean onFlight) {}
