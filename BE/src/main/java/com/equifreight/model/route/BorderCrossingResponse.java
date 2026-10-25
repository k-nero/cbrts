package com.equifreight.model.route;

import java.util.UUID;
import lombok.Builder;

/** A border crossing a route plan can stop at (US-F3-17): its countries as catalogued, and whether it is road only. */
@Builder
public record BorderCrossingResponse(UUID id, String name, String fromCountry, String toCountry, boolean roadOnly) {}
