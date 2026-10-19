package com.equifreight.model.route;

import lombok.Builder;

/** A border crossing, its countries in the direction of travel. */
@Builder
public record CrossingResponse(String name, String fromCountry, String toCountry) {}
