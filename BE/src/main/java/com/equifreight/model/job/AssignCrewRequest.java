package com.equifreight.model.job;

import com.equifreight.entity.enums.CrewRole;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** The job's whole crew; a missing list is empty. */
@Builder
public record AssignCrewRequest(List<CrewItem> crew) {

    public AssignCrewRequest {
        crew = crew == null ? List.of() : crew;
    }

    @Builder
    public record CrewItem(@NotNull UUID userId, @NotNull CrewRole crewRole) {}
}
