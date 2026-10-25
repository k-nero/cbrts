package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;

@Builder(toBuilder = true)
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
        /** The confirmed trailers; for the escort, the ones they ride. */
        String vehicleCode,
        /** True when the trailer carries another job too; the customer is told only that, never whose. */
        boolean shared,
        /** The confirmed route's flights; for the customer, with only their own consignment (US-F3-15). */
        List<TripFlightResponse> flights,
        List<TripStopResponse> stops,
        List<TripHorseResponse> horses,
        List<TripRecordResponse> records,
        /** Every part of a job an incident split across trips; empty while the job is on one trip (US-F5-06). */
        List<TripPartResponse> parts,
        /** The job's handover once its horses are delivered (US-F6-01); null before. */
        HandoverResponse handover) {}
