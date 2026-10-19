package com.equifreight.model.rate;

import com.equifreight.entity.enums.TransportMode;
import java.util.UUID;
import lombok.Builder;

/** A corridor in the Rates page's list, with how many rates it lacks. */
@Builder
public record RateCorridorResponse(
        UUID id,
        String code,
        TransportMode mode,
        String fromCity,
        String toCity,
        Integer distanceKm,
        int crossingCount,
        int missingCount) {}
