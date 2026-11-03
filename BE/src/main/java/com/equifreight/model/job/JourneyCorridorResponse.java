package com.equifreight.model.job;

import com.equifreight.entity.enums.TransportMode;
import java.util.UUID;

/**
 * A corridor the next trip of a job's journey can run (US-F3-21), read from the city the journey has reached:
 * {@code reversed} when it is driven or flown from its destination city to its origin city.
 */
public record JourneyCorridorResponse(
        UUID corridorId,
        String corridorCode,
        TransportMode mode,
        boolean reversed,
        String fromCity,
        String toCity,
        /** The trip would end in the city the horses are going to. */
        boolean reachesDestination,
        /** The corridor is on the route the customer was quoted. */
        boolean quoted) {}
