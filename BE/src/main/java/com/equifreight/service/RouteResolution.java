package com.equifreight.service;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.route.RouteResponse;
import java.util.Set;

/**
 * What a request's two ends and mode resolve to (spec R-05).
 *
 * @param corridor                   the corridor to store, or null
 * @param route                      that corridor in the direction of travel, with its lead time; null without one
 * @param modesRun                   the modes we run between the two places' cities; empty unless both ends are places
 * @param catalogMissingFor          the name of a country on the route with no published regulation version, or null
 * @param originTypedCityServed      the origin is typed text naming a city some place is in
 * @param destinationTypedCityServed the same for the destination
 */
public record RouteResolution(
        Corridor corridor,
        RouteResponse route,
        Set<TransportMode> modesRun,
        String catalogMissingFor,
        boolean originTypedCityServed,
        boolean destinationTypedCityServed) {

    public static RouteResolution none() {
        return new RouteResolution(null, null, Set.of(), null, false, false);
    }
}
