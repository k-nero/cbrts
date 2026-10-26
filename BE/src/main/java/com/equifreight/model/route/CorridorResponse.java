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
        /* The border crossings the route takes, in order from the origin. */
        List<String> crossings,
        Instant updatedAt) {}
