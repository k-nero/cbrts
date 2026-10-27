package com.equifreight.model.route;

import java.util.UUID;
import lombok.Builder;

/** A domestic road leg to or from a hub (US-F1-09), read in the direction of travel: "Da Nang → Ho Chi Minh City". */
@Builder
public record RouteLegResponse(UUID corridorId, String code, String fromCity, String toCity, Integer distanceKm) {}
