package com.equifreight.model.job;

import com.equifreight.entity.enums.TransportMode;
import java.time.LocalDate;
import java.util.List;
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
        boolean quoted,
        /**
         * The quarantine stations in {@code toCity} where the job has a quarantine scheduled: the trip can end at one of
         * them instead of the city's cargo terminal (US-F3-22). Empty when the trip delivers.
         */
        List<QuarantineStation> quarantineStations) {

    /** A station where the job's horses wait in quarantine, and the days they wait there. */
    public record QuarantineStation(UUID placeId, String placeName, LocalDate startsOn, LocalDate endsOn) {}
}
