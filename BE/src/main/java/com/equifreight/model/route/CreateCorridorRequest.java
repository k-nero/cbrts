package com.equifreight.model.route;

import com.equifreight.entity.enums.TransportMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A new route we run: its code, mode and two cities, and for a road route the border crossings it takes, in order
 * from the origin. Each city needs a place before the route can be added.
 */
@Builder(toBuilder = true)
public record CreateCorridorRequest(
        @NotBlank @Size(max = 40) String code,
        @NotNull TransportMode mode,
        @NotBlank @Size(max = 80) String originCity,
        @NotBlank @Size(max = 80) String destinationCity,
        @Positive Integer distanceKm,
        /* 0 to 7; 3 when left out. */
        Integer dateFlexDays,
        /* 1 to 30; from the distance at 500 km a day when left out (US-F7-02). */
        Integer drivingDays,
        List<UUID> crossingIds) {

    public CreateCorridorRequest {
        crossingIds = crossingIds == null ? List.of() : crossingIds;
        dateFlexDays = dateFlexDays == null ? 3 : dateFlexDays;
    }
}
