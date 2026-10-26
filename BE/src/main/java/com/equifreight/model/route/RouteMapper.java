package com.equifreight.model.route;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import java.time.LocalDate;
import java.util.List;

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

    /** A route we run, as the fleet & route coordinator sees it. */
    public static CorridorResponse toCorridorResponse(Corridor corridor, List<String> crossings) {
        return CorridorResponse.builder()
                .id(corridor.getId())
                .code(corridor.getCode())
                .mode(corridor.getMode())
                .originCity(corridor.getOriginCity())
                .destinationCity(corridor.getDestinationCity())
                .distanceKm(corridor.getDistanceKm())
                .dateFlexDays(corridor.getDateFlexDays())
                .crossings(crossings)
                .updatedAt(corridor.getUpdatedAt())
                .build();
    }

    /** A border crossing as catalogued, for a route plan's border stops and a new corridor. */
    public static BorderCrossingResponse toBorderCrossingResponse(BorderCrossing crossing) {
        return BorderCrossingResponse.builder()
                .id(crossing.getId())
                .name(crossing.getName())
                .fromCountry(crossing.getFromCountry().getName())
                .toCountry(crossing.getToCountry().getName())
                .roadOnly(crossing.isRoadOnly())
                .build();
    }

    public static CountryOptionResponse toCountryOption(Country country) {
        return CountryOptionResponse.builder()
                .id(country.getId())
                .code(country.getCode())
                .name(country.getName())
                .build();
    }

    /** A border crossing in the direction of travel: {@code reversed} when the trip runs the corridor backwards. */
    public static CrossingResponse toCrossingResponse(BorderCrossing crossing, boolean reversed) {
        return CrossingResponse.builder()
                .name(crossing.getName())
                .fromCountry((reversed ? crossing.getToCountry() : crossing.getFromCountry()).getCode())
                .toCountry((reversed ? crossing.getFromCountry() : crossing.getToCountry()).getCode())
                .build();
    }

    /**
     * A corridor read in the direction of travel. {@code countries} and {@code countryNames} are null without a
     * destination place, and
     * {@code leadTimeDays} and {@code earliestDeparture} are null when either is unknown.
     */
    public static RouteResponse toRouteResponse(
            Corridor corridor,
            boolean reversed,
            List<CrossingResponse> crossings,
            List<String> countries,
            List<String> countryNames,
            Integer leadTimeDays,
            LocalDate earliestDeparture) {
        return RouteResponse.builder()
                .corridorId(corridor.getId())
                .code(corridor.getCode())
                .mode(corridor.getMode())
                .fromCity(reversed ? corridor.getDestinationCity() : corridor.getOriginCity())
                .toCity(reversed ? corridor.getOriginCity() : corridor.getDestinationCity())
                .distanceKm(corridor.getDistanceKm())
                .dateFlexDays((int) corridor.getDateFlexDays())
                .crossings(crossings)
                .countries(countries)
                .countryNames(countryNames)
                .crossBorder(countries == null ? null : countries.size() > 1)
                .leadTimeDays(leadTimeDays)
                .earliestDeparture(earliestDeparture)
                .build();
    }
}
