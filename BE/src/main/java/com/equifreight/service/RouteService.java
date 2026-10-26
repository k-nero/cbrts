package com.equifreight.service;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.route.CrossingResponse;
import com.equifreight.model.route.PlaceResponse;
import com.equifreight.model.route.RouteMapper;
import com.equifreight.model.route.RouteResponse;
import com.equifreight.repository.BorderCrossingRepository;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.RegulationCatalogRepository;
import com.equifreight.repository.RegulationVersionRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Routes come from the catalog: a corridor between the two places' cities, in either direction (spec R-05),
 * and the lead time of the countries it crosses, from each country's newest published regulation version
 * (R-06).
 */
@Service
public class RouteService {

    private final CorridorRepository corridors;
    private final PlaceRepository places;
    private final BorderCrossingRepository crossings;
    private final RegulationCatalogRepository catalogs;
    private final RegulationVersionRepository versions;
    private final Clock clock;

    public RouteService(
            CorridorRepository corridors,
            PlaceRepository places,
            BorderCrossingRepository crossings,
            RegulationCatalogRepository catalogs,
            RegulationVersionRepository versions,
            Clock clock) {
        this.corridors = corridors;
        this.places = places;
        this.crossings = crossings;
        this.catalogs = catalogs;
        this.versions = versions;
        this.clock = clock;
    }

    /** Pickup and delivery points; welfare stops are stops on a trip, not ends of one. */
    @Transactional(readOnly = true)
    public Page<PlaceResponse> places(String q, Pageable pageable) {
        Specification<Place> spec = (root, query, cb) -> cb.notEqual(root.get("kind"), PlaceKind.WELFARE_STOP);
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) ->
                    cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(root.get("city")), like)));
        }
        return places.findAll(spec, pageable).map(RouteMapper::toResponse);
    }

    /** Every catalogued place a route plan can stop at (US-F3-17), welfare stops included, by name or city. */
    @Transactional(readOnly = true)
    public Page<PlaceResponse> stopPlaces(String q, Pageable pageable) {
        Specification<Place> spec = Specification.unrestricted();
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) ->
                    cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(root.get("city")), like)));
        }
        return places.findAll(spec, pageable).map(RouteMapper::toResponse);
    }

    /** Every border crossing, by name, for a route plan's border stops (US-F3-17). */
    @Transactional(readOnly = true)
    public List<com.equifreight.model.route.BorderCrossingResponse> borderCrossings() {
        return crossings.findAllByOrderByNameAsc().stream()
                .map(RouteMapper::toBorderCrossingResponse)
                .toList();
    }

    /**
     * The corridors we run between two places, or without {@code toPlaceId} the corridors touching the
     * origin's city (the alternatives to a route we don't run), read from the origin's side.
     */
    @Transactional(readOnly = true)
    public List<RouteResponse> routes(UUID fromPlaceId, UUID toPlaceId) {
        Place from = findPlace(fromPlaceId);
        if (toPlaceId == null) {
            if (from.getCity() == null) {
                return List.of();
            }
            return corridors.findTouchingCity(from.getCity()).stream()
                    .map(c -> describeFrom(c, from, null).route())
                    .toList();
        }
        Place to = findPlace(toPlaceId);
        if (from.getCity() == null || to.getCity() == null) {
            return List.of();
        }
        return corridors.findBetweenCities(from.getCity(), to.getCity()).stream()
                .map(c -> describeFrom(c, from, to).route())
                .toList();
    }

    /**
     * R-05: both ends must be places; with a mode, the corridor of that mode, otherwise the only mode run
     * between the two cities. A forward corridor wins over a reversed one. A typed end never resolves.
     */
    public RouteResolution resolve(
            Place origin, String originText, Place destination, String destinationText, TransportMode mode) {
        boolean originServed =
                originText != null && places.existsByCityIgnoreCaseAndKindNot(originText, PlaceKind.WELFARE_STOP);
        boolean destinationServed = destinationText != null
                && places.existsByCityIgnoreCaseAndKindNot(destinationText, PlaceKind.WELFARE_STOP);
        if (origin == null || destination == null || origin.getCity() == null || destination.getCity() == null) {
            return new RouteResolution(null, null, Set.of(), null, originServed, destinationServed);
        }
        List<Corridor> candidates = corridors.findBetweenCities(origin.getCity(), destination.getCity());
        Set<TransportMode> modesRun = EnumSet.noneOf(TransportMode.class);
        candidates.forEach(c -> modesRun.add(c.getMode()));
        TransportMode chosen = mode != null
                ? mode
                : (modesRun.size() == 1 ? modesRun.iterator().next() : null);
        Optional<Corridor> corridor = chosen == null
                ? Optional.empty()
                : candidates.stream()
                        .filter(c -> c.getMode() == chosen)
                        .min(Comparator.comparing(c -> isReversed(c, origin) ? 1 : 0));
        if (corridor.isEmpty()) {
            return new RouteResolution(null, null, Set.copyOf(modesRun), null, false, false);
        }
        Described described = describeFrom(corridor.get(), origin, destination);
        return new RouteResolution(
                corridor.get(), described.route(), Set.copyOf(modesRun), described.catalogMissingFor(), false, false);
    }

    /** A stored corridor, read from the request's origin. */
    public RouteResponse describe(Corridor corridor, Place origin, Place destination) {
        return describeFrom(corridor, origin, destination).route();
    }

    private record Described(RouteResponse route, String catalogMissingFor) {}

    private Described describeFrom(Corridor corridor, Place origin, Place destination) {
        boolean reversed = isReversed(corridor, origin);
        List<CorridorCrossing> ordered = new ArrayList<>(corridor.getCrossings());
        ordered.sort(Comparator.comparingInt(CorridorCrossing::getSeq));
        if (reversed) {
            Collections.reverse(ordered);
        }
        List<CrossingResponse> crossings = new ArrayList<>();
        Map<String, String> countries = new LinkedHashMap<>();
        if (destination != null) {
            put(countries, origin.getCountry());
        }
        for (CorridorCrossing cc : ordered) {
            BorderCrossing b = cc.getBorderCrossing();
            crossings.add(RouteMapper.toCrossingResponse(b, reversed));
            put(countries, reversed ? b.getToCountry() : b.getFromCountry());
            put(countries, reversed ? b.getFromCountry() : b.getToCountry());
        }
        if (destination == null) {
            return new Described(
                    RouteMapper.toRouteResponse(corridor, reversed, crossings, null, null, null, null), null);
        }
        put(countries, destination.getCountry());
        List<String> codes = List.copyOf(countries.keySet());
        List<String> names = List.copyOf(countries.values());

        Map<String, RegulationVersion> published = new HashMap<>();
        for (String code : codes) {
            Optional<RegulationVersion> version = catalogs.findByCountryCode(code)
                    .flatMap(catalog ->
                            versions.findByCatalogIdAndStatusOrdered(catalog.getId(), CatalogStatus.PUBLISHED).stream()
                                    .findFirst());
            if (version.isEmpty()) {
                return new Described(
                        RouteMapper.toRouteResponse(corridor, reversed, crossings, codes, names, null, null),
                        countries.get(code));
            }
            published.put(code, version.get());
        }
        int required = LeadTimePolicy.requiredDays(codes, published);
        LocalDate today = LocalDate.now(clock);
        return new Described(
                RouteMapper.toRouteResponse(
                        corridor,
                        reversed,
                        crossings,
                        codes,
                        names,
                        required,
                        LeadTimePolicy.earliestDeparture(today, required)),
                null);
    }

    private static boolean isReversed(Corridor corridor, Place origin) {
        return !corridor.getOriginCity().equalsIgnoreCase(origin.getCity());
    }

    private static void put(Map<String, String> countries, Country country) {
        countries.putIfAbsent(country.getCode(), country.getName());
    }

    private Place findPlace(UUID id) {
        return places.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Place", id));
    }
}
