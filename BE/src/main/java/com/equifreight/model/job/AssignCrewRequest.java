package com.equifreight.model.job;

import com.equifreight.entity.enums.CrewRole;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** The job's whole crew; a missing list is empty. */
@Builder
/**
 * The whole crew of one trailer on the trip, or of its flight. {@code tripVehicleId} may be left out while the trip
 * has one trailer.
 */
public record AssignCrewRequest(
        UUID tripVehicleId,
        List<CrewItem> crew,
        /** True for the trip's flight crew (flying grooms, the flight vet) instead of a trailer's (US-F3-15). */
        boolean flight) {

    public AssignCrewRequest {
        crew = crew == null ? List.of() : crew;
    }

    public AssignCrewRequest(UUID tripVehicleId, List<CrewItem> crew) {
        this(tripVehicleId, crew, false);
    }

    @Builder
    public record CrewItem(@NotNull UUID userId, @NotNull CrewRole crewRole) {}
}
