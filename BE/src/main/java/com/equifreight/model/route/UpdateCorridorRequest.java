package com.equifreight.model.route;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A change to a route we run: its code, distance, flexible and driving days, and for a road route its welfare stops and
 * the border crossings
 * it takes, in order from the origin. Its mode and two cities stay: they are what the route is, and what it is priced
 * and quoted by.
 */
@Builder(toBuilder = true)
public record UpdateCorridorRequest(
        @NotBlank @Size(max = 40) String code,
        @Positive Integer distanceKm,
        @NotNull Integer dateFlexDays,
        /* 1 to 30; ignored on an air route. */
        Integer drivingDays,
        /* 0 to 20 on a road route, or null for none; ignored on an air route. */
        Integer welfareStops,
        List<UUID> crossingIds) {

    public UpdateCorridorRequest {
        crossingIds = crossingIds == null ? List.of() : crossingIds;
    }
}
