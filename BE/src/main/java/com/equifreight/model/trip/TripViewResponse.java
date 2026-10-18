package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;

public record TripViewResponse(
        String jobCode,
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
