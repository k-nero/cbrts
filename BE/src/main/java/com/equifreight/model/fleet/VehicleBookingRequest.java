package com.equifreight.model.fleet;

import com.equifreight.entity.enums.BookingKind;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VehicleBookingRequest {
    @NotNull
    private UUID vehicleId;

    private UUID jobId;

    @NotNull
    private BookingKind kind;

    @NotNull
    private Instant startsAt;

    @NotNull
    private Instant endsAt;
}
