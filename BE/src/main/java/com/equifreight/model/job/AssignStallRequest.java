package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AssignStallRequest {
    @NotNull
    private UUID vehicleStallId;

    /**
     * Null to unassign
     */
    private UUID horseId;
}
