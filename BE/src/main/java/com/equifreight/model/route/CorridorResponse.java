package com.equifreight.model.route;

import com.equifreight.entity.enums.TransportMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** A route we run, as the fleet & route coordinator sees it (#115). */
@Builder
public record CorridorResponse(
        UUID id,
        String code,
        TransportMode mode,
        String originCity,
        String destinationCity,
        Integer distanceKm,
        /* How far a request's flexible dates can move on this route; 0 means fixed dates only. */
        int dateFlexDays,
        /* Days to drive it one way: a trip's length before its route is planned, and an empty drive back (US-F7-02). */
        int drivingDays,
        /* The border crossings the route takes, in order from the origin. */
        List<String> crossings,
        /* The countries it passes through, in order: "VN", "KH", "TH" (US-F7-01). */
        List<String> countries,
        /* How many vehicles run it; a road route nobody runs can't be planned. Null where it isn't counted. */
        Long vehicleCount,
        Instant updatedAt) {}
