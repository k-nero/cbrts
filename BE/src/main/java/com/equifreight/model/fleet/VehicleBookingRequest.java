package com.equifreight.model.fleet;

import com.equifreight.entity.enums.BookingKind;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record VehicleBookingRequest(
        @NotNull UUID vehicleId,
        UUID jobId,
        @NotNull BookingKind kind,
        @NotNull Instant startsAt,
        @NotNull Instant endsAt) {}
