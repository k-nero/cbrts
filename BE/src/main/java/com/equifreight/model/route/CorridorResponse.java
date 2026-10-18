package com.equifreight.model.route;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.enums.TransportMode;
import java.time.Instant;
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
        /** How far a request's flexible dates can move on this route; 0 means fixed dates only. */
        int dateFlexDays,
        Instant updatedAt) {
    public static CorridorResponse of(Corridor corridor) {
        return CorridorResponse.builder()
                .id(corridor.getId())
                .code(corridor.getCode())
                .mode(corridor.getMode())
                .originCity(corridor.getOriginCity())
                .destinationCity(corridor.getDestinationCity())
                .distanceKm(corridor.getDistanceKm())
                .dateFlexDays(corridor.getDateFlexDays())
                .updatedAt(corridor.getUpdatedAt())
                .build();
    }
}
