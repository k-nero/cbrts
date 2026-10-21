package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Builder;

@Builder
public record AssignStallRequest(
        @NotNull UUID vehicleStallId,
        /**
         * Null to unassign
         */
        UUID horseId) {}
