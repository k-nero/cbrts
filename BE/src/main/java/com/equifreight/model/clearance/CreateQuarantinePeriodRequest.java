package com.equifreight.model.clearance;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuarantinePeriodRequest {

    /** null means the whole load/shipment. */
    private UUID horseId;

    @NotNull(message = "Place ID (trạm kiểm dịch) is required")
    private UUID placeId;

    @NotNull(message = "Starts on date is required")
    private LocalDate startsOn;

    @NotNull(message = "Ends on date is required")
    private LocalDate endsOn;
}
