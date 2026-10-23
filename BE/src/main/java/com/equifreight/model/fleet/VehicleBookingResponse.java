package com.equifreight.model.fleet;

import com.equifreight.entity.enums.VehicleKind;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record VehicleBookingResponse(
        UUID id,
        UUID vehicleId,
        String vehicleCode,
        VehicleKind vehicleKind,
        /** The trip's TRP code, for a JOB booking. */
        String tripCode,
        /** Set when the trip carries one job. */
        UUID jobId,
        /** The codes of the trip's jobs, comma-separated. */
        String jobCode,
        String kind,
        Instant startsAt,
        Instant endsAt) {}
