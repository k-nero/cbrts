package com.equifreight.model.job;

import com.equifreight.entity.enums.ServiceClass;
import java.util.UUID;

/** One job's consignment on a flight (US-F3-15). */
public record FlightAllocationResponse(
        UUID id, UUID jobId, String jobCode, String airWaybill, Short stallPositions, ServiceClass serviceClass) {}
