package com.equifreight.model.route;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A border crossing, its countries in the direction of travel. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrossingResponse {
    private String name;
    private String fromCountry;
    private String toCountry;
}
