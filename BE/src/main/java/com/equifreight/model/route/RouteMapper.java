package com.equifreight.model.route;

import com.equifreight.entity.Place;

public final class RouteMapper {

    private RouteMapper() {}

    public static PlaceResponse toResponse(Place place) {
        return PlaceResponse.builder()
                .id(place.getId())
                .name(place.getName())
                .kind(place.getKind())
                .city(place.getCity())
                .countryCode(place.getCountry().getCode())
                .countryName(place.getCountry().getName())
                .build();
    }
}
