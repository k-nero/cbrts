package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

@Builder
public record TripViewResponse(
        String jobCode,
        /** The trip's TRP code for staff and the crew; null for the customer, who never sees it. */
        String tripCode,
        TripStatus tripStatus,
        boolean clearanceReady,
        Instant plannedDepartureAt,
        Instant plannedArrivalAt,
        Instant arrivalWindowStart,
        Instant arrivalWindowEnd,
        String origin,
        String destination,
        String vehicleCode,
        List<TripStopResponse> stops,
        List<TripHorseResponse> horses,
        List<TripRecordResponse> records) {}
