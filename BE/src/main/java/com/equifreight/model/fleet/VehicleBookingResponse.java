package com.equifreight.model.fleet;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record VehicleBookingResponse(
        UUID id,
        UUID vehicleId,
        String vehicleCode,
        UUID jobId,
        String jobCode,
        String kind,
        Instant startsAt,
        Instant endsAt) {}
