package com.equifreight.model.job;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/**
 * Move one horse on the load plan, stating what the coordinator's screen showed. The server
 * refuses with 409 when the plan no longer matches, instead of overwriting someone else's change.
 */
@Getter
@Setter
public class MoveHorseRequest {
    @NotNull
    private UUID horseId;

    /**
     * The stall the horse was in on the coordinator's screen; null when it was waiting to load.
     */
    private UUID fromStallId;

    /**
     * The stall to put the horse in; null to take it off the vehicle.
     */
    private UUID toStallId;

    /**
     * The horse the coordinator saw in the target stall; null when it looked empty. When set, the
     * two horses swap: that horse goes to {@code fromStallId}, or back to the to-load list.
     */
    private UUID expectedOccupantId;
}
