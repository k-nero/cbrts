package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

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
