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
@Builder(toBuilder = true)
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
        /** The same countries by name, in travel order ("Vietnam", "Cambodia"). */
        List<String> countryNames,
        Boolean crossBorder,
        Integer leadTimeDays,
        LocalDate earliestDeparture,
        /** The domestic road leg from the origin's city to the hub this corridor leaves from (US-F1-09); else null. */
        RouteLegResponse firstLeg,
        /** The domestic road leg from the hub this corridor arrives in to the destination's city; else null. */
        RouteLegResponse lastLeg,
        /** Before a flight from a stable, the local run to the cargo terminal (US-F3-22); else null. */
        RouteTerminalRunResponse toTerminal,
        /** After a flight that lands in the stable's city, the local run from the cargo terminal; else null. */
        RouteTerminalRunResponse fromTerminal,
        /** The customer's pickup place by name; null without a destination. */
        String fromPlace,
        /** The customer's delivery place by name; null without a destination. */
        String toPlace,
        /** A flight's airport terminal at the city it leaves from, by name; null by road or when none is in the catalog. */
        String departureTerminal,
        /** A flight's airport terminal at the city it lands in, by name; null by road or when none is in the catalog. */
        String arrivalTerminal) {}
