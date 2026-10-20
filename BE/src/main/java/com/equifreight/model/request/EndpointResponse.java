package com.equifreight.model.request;

import com.equifreight.entity.enums.PlaceKind;
import java.util.UUID;
import lombok.Builder;

/** One end of a request: a catalog place, or the city the customer typed ({@code text}). */
@Builder
public record EndpointResponse(
        UUID placeId, String name, PlaceKind kind, String city, String countryCode, String text) {}
