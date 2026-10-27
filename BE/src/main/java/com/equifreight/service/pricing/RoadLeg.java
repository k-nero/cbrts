package com.equifreight.service.pricing;

import java.util.List;

/**
 * A domestic road leg to or from a hub (US-F1-09), priced into the move from its own corridor's per-km road rates:
 * group A before the corridor that crosses the border, G after it.
 *
 * @param group      {@code A} for the leg to the hub, {@code G} for the leg from it
 * @param code       the leg's corridor ("RD DAD → HCM")
 * @param fromCity   where the leg starts, in the direction of travel
 * @param toCity     where it ends
 * @param distanceKm the leg's distance; null when the corridor has none
 * @param freight    the leg corridor's per-km road rows, its own merged with the every-corridor ones
 */
public record RoadLeg(
        String group, String code, String fromCity, String toCity, Integer distanceKm, List<RateRow> freight) {}
