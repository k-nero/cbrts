package com.equifreight.model.clearance;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record CreateQuarantinePeriodRequest(
        /*
         * null means the whole load/shipment.
         */
        UUID horseId,

        @NotNull(message = "Place ID is required") UUID placeId,

        @NotNull(message = "Starts on date is required") LocalDate startsOn,
        @NotNull(message = "Ends on date is required") LocalDate endsOn) {}
