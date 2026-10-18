package com.equifreight.model.route;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.enums.TransportMode;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A route we run, as the fleet & route coordinator sees it (#115). */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CorridorResponse {
    private UUID id;
    private String code;
    private TransportMode mode;
    private String originCity;
    private String destinationCity;
    private Integer distanceKm;
    /** How far a request's flexible dates can move on this route; 0 means fixed dates only. */
    private int dateFlexDays;

    private Instant updatedAt;

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
