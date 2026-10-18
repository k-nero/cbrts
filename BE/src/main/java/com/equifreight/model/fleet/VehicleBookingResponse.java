package com.equifreight.model.fleet;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class VehicleBookingResponse {
    private UUID id;
    private UUID vehicleId;
    private String vehicleCode;
    private UUID jobId;
    private String jobCode;
    private String kind;
    private Instant startsAt;
    private Instant endsAt;
}
