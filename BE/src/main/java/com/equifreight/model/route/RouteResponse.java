package com.equifreight.model.route;

import com.equifreight.entity.enums.TransportMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A corridor we run, read in the direction of travel. Without a destination place (the alternatives on a
 * route we don't run), countries, crossBorder and the lead time are null; the lead time is also null when a
 * country on the route has no published regulation catalog.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteResponse {
    private UUID corridorId;
    private String code;
    private TransportMode mode;
    private String fromCity;
    private String toCity;
    private Integer distanceKm;
    private List<CrossingResponse> crossings;
    private List<String> countries;
    private Boolean crossBorder;
    private Integer leadTimeDays;
    private LocalDate earliestDeparture;
}
