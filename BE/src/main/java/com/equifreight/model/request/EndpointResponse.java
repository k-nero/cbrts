package com.equifreight.model.request;

import com.equifreight.entity.enums.PlaceKind;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One end of a request: a catalog place, or the city the customer typed ({@code text}). */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EndpointResponse {
    private UUID placeId;
    private String name;
    private PlaceKind kind;
    private String city;
    private String countryCode;
    private String text;
}
