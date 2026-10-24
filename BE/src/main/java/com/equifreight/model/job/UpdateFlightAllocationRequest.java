package com.equifreight.model.job;

import com.equifreight.entity.enums.ServiceClass;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** One job's consignment on its trip's flight (US-F3-15): air waybill, stall positions, service class. */
public record UpdateFlightAllocationRequest(
        @Size(max = 20) String airWaybill,
        @NotNull @Min(1) @Max(99) Short stallPositions,
        ServiceClass serviceClass) {}
