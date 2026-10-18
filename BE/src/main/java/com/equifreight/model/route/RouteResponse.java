package com.equifreight.model.route;

import com.equifreight.entity.enums.TransportMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A corridor we run, read in the direction of travel. Without a destination place (the alternatives on a
 * route we don't run), countries, crossBorder and the lead time are null; the lead time is also null when a
 * country on the route has no published regulation catalog.
 */
@Builder
public record RouteResponse(
        UUID corridorId,
        String code,
        TransportMode mode,
        String fromCity,
        String toCity,
        Integer distanceKm,
        /** How far flexible dates can move on this route (#115): the wizard's "±N days". */
        Integer dateFlexDays,
        List<CrossingResponse> crossings,
        List<String> countries,
        Boolean crossBorder,
        Integer leadTimeDays,
        LocalDate earliestDeparture) {}
