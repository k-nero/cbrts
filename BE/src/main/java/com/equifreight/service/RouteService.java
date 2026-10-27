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

    /**
     * Pickup and delivery points. Welfare stops are stops on a trip, not ends of one, and airports and cargo terminals
     * are where we change carrier, which the route plans (US-F1-09): the customer names where the horses start and end.
     */
    @Transactional(readOnly = true)
    public Page<PlaceResponse> places(String q, Pageable pageable) {
        Specification<Place> spec = (root, query, cb) -> cb.not(root.get("kind").in(NOT_AN_END));
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) ->
                    cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(root.get("city")), like)));
        }
        return places.findAll(spec, pageable).map(RouteMapper::toResponse);
    }

    /** Every catalogued place a route plan can stop at (US-F3-17), welfare stops included, by name or city. */
    /** Places that are never a request's pickup or delivery point. */
    private static final Set<PlaceKind> NOT_AN_END =
            EnumSet.of(PlaceKind.WELFARE_STOP, PlaceKind.AIRPORT, PlaceKind.CARGO_TERMINAL);

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
                    .map(c -> describeFrom(c, from, null, from.getCity()).route())
                    .toList();
        }
        Place to = findPlace(toPlaceId);
        if (from.getCity() == null || to.getCity() == null) {
            return List.of();
        }
        List<Corridor> direct = corridors.findBetweenCities(from.getCity(), to.getCity());
        if (!direct.isEmpty()) {
            return direct.stream()
                    .map(c -> describeFrom(c, from, to, from.getCity()).route())
                    .toList();
        }
        // No corridor joins the two cities: the shortest route by way of hubs for each mode (US-F1-09).
        Map<TransportMode, HubRoute> shortest = new LinkedHashMap<>();
        viaHubs(from.getCity(), to.getCity()).stream()
                .sorted(Comparator.comparingInt(HubRoute::distanceKm))
                .forEach(r -> shortest.putIfAbsent(r.corridor().getMode(), r));
        return shortest.values().stream()
                .map(r -> describe(r.corridor(), r.firstLeg(), r.lastLeg(), from, to))
                .toList();
    }

    /**
     * R-05: both ends must be places; with a mode, the corridor of that mode, otherwise the only mode run
     * between the two cities. A forward corridor wins over a reversed one. A typed end never resolves. When no
     * corridor of the mode joins the two cities, the route goes by way of hubs (US-F1-09): a domestic road leg to the
     * city a cross-border corridor leaves from, that corridor, and a domestic road leg from where it arrives, the
     * shortest such route.
     */
    public RouteResolution resolve(
            Place origin, String originText, Place destination, String destinationText, TransportMode mode) {
        boolean originServed =
                originText != null && places.existsByCityIgnoreCaseAndKindNot(originText, PlaceKind.WELFARE_STOP);
        boolean destinationServed = destinationText != null
                && places.existsByCityIgnoreCaseAndKindNot(destinationText, PlaceKind.WELFARE_STOP);
        if (origin == null || destination == null || origin.getCity() == null || destination.getCity() == null) {
            return new RouteResolution(null, null, null, null, Set.of(), null, originServed, destinationServed);
        }
        List<Corridor> candidates = corridors.findBetweenCities(origin.getCity(), destination.getCity());
        Set<TransportMode> modesRun = EnumSet.noneOf(TransportMode.class);
        candidates.forEach(c -> modesRun.add(c.getMode()));
        // A mode no corridor runs between the two cities may still run by way of hubs.
        List<HubRoute> viaHubs = modesRun.size() == TransportMode.values().length
                ? List.of()
                : viaHubs(origin.getCity(), destination.getCity()).stream()
                        .filter(r -> !modesRun.contains(r.corridor().getMode()))
                        .toList();
        viaHubs.forEach(r -> modesRun.add(r.corridor().getMode()));
        TransportMode chosen = mode != null
                ? mode
                : (modesRun.size() == 1 ? modesRun.iterator().next() : null);
        if (chosen == null) {
            return new RouteResolution(null, null, null, null, Set.copyOf(modesRun), null, false, false);
        }
        Optional<HubRoute> route = candidates.stream()
                .filter(c -> c.getMode() == chosen)
                .min(Comparator.comparing(c -> isReversed(c, origin.getCity()) ? 1 : 0))
                .map(c -> new HubRoute(c, null, null))
                .or(() -> viaHubs.stream()
                        .filter(r -> r.corridor().getMode() == chosen)
                        .min(Comparator.comparingInt(HubRoute::distanceKm)));
        if (route.isEmpty()) {
            return new RouteResolution(null, null, null, null, Set.copyOf(modesRun), null, false, false);
        }
        HubRoute r = route.get();
        Described described = describeFrom(r.corridor(), origin, destination, r.departureCity(origin.getCity()));
        return new RouteResolution(
                r.corridor(),
                r.firstLeg(),
                r.lastLeg(),
                withLegs(described.route(), r, origin.getCity(), destination.getCity()),
                Set.copyOf(modesRun),
                described.catalogMissingFor(),
                false,
                false);
    }

    /**
     * A route by way of hubs (US-F1-09): a corridor that crosses a border, with the domestic road legs that bring
     * the horses to the city it leaves from and take them on from the city it arrives in.
     */
    record HubRoute(Corridor corridor, Corridor firstLeg, Corridor lastLeg) {

        int distanceKm() {
            return km(corridor) + km(firstLeg) + km(lastLeg);
        }

        /** The city the corridor is travelled from: the first leg's far end, else the origin's city. */
        String departureCity(String originCity) {
            return firstLeg == null ? originCity : otherEnd(firstLeg, originCity);
        }

        private static int km(Corridor c) {
            return c == null || c.getDistanceKm() == null ? 0 : c.getDistanceKm();
        }
    }

    /**
     * The routes between two cities by way of hubs (US-F1-09), from one query for the corridor network: a domestic
     * road leg from the origin's city, or none, then a corridor that crosses a border, then a domestic road leg to the
     * destination's city, or none, with at least one leg. Two domestic corridors are never chained into a domestic
     * route, and a route never goes through a hub only to come back.
     */
    List<HubRoute> viaHubs(String fromCity, String toCity) {
        List<Corridor> network = corridors.findNetwork();
        List<HubRoute> routes = new ArrayList<>();
        for (Corridor first : legsTouching(network, fromCity)) {
            String hubOut = first == null ? fromCity : otherEnd(first, fromCity);
            for (Corridor last : legsTouching(network, toCity)) {
                if (first == null && last == null) continue;
                String hubIn = last == null ? toCity : otherEnd(last, toCity);
                if (hubOut.equalsIgnoreCase(toCity) || hubIn.equalsIgnoreCase(fromCity)) continue;
                for (Corridor c : network) {
                    if (c.crossesBorder() && joins(c, hubOut, hubIn)) routes.add(new HubRoute(c, first, last));
                }
            }
        }
        return routes;
    }

    /** No leg (null) first, then every domestic road corridor touching the city. */
    private static List<Corridor> legsTouching(List<Corridor> network, String city) {
        List<Corridor> legs = new ArrayList<>();
        legs.add(null);
        network.stream()
                .filter(c -> c.isRoad() && !c.crossesBorder())
                .filter(c -> c.getOriginCity().equalsIgnoreCase(city)
                        || c.getDestinationCity().equalsIgnoreCase(city))
                .forEach(legs::add);
        return legs;
    }

    private static boolean joins(Corridor c, String a, String b) {
        return (c.getOriginCity().equalsIgnoreCase(a) && c.getDestinationCity().equalsIgnoreCase(b))
                || (c.getOriginCity().equalsIgnoreCase(b)
                        && c.getDestinationCity().equalsIgnoreCase(a));
    }

    private static String otherEnd(Corridor c, String city) {
        return c.getOriginCity().equalsIgnoreCase(city) ? c.getDestinationCity() : c.getOriginCity();
    }

    private static RouteResponse withLegs(RouteResponse route, HubRoute r, String fromCity, String toCity) {
        if (route == null || (r.firstLeg() == null && r.lastLeg() == null)) return route;
        return route.toBuilder()
                .firstLeg(r.firstLeg() == null ? null : RouteMapper.toLegResponse(r.firstLeg(), fromCity))
                .lastLeg(
                        r.lastLeg() == null
                                ? null
                                : RouteMapper.toLegResponse(r.lastLeg(), otherEnd(r.lastLeg(), toCity)))
                .build();
    }

    /** A stored request's route: its corridor read from where it is travelled, with its domestic legs (US-F1-09). */
    public RouteResponse describe(
            Corridor corridor, Corridor firstLeg, Corridor lastLeg, Place origin, Place destination) {
        HubRoute r = new HubRoute(corridor, firstLeg, lastLeg);
        RouteResponse route = describeFrom(corridor, origin, destination, r.departureCity(origin.getCity()))
                .route();
        return destination == null ? route : withLegs(route, r, origin.getCity(), destination.getCity());
    }

    /** A stored corridor, read from the request's origin. */
    public RouteResponse describe(Corridor corridor, Place origin, Place destination) {
        return describeFrom(corridor, origin, destination, origin.getCity()).route();
    }

    private record Described(RouteResponse route, String catalogMissingFor) {}

    /** {@code fromCity}: where the corridor is travelled from, the origin's city or the hub its first leg reaches. */
    private Described describeFrom(Corridor corridor, Place origin, Place destination, String fromCity) {
        boolean reversed = isReversed(corridor, fromCity);
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

    private static boolean isReversed(Corridor corridor, String fromCity) {
        return !corridor.getOriginCity().equalsIgnoreCase(fromCity);
    }

    private static void put(Map<String, String> countries, Country country) {
        countries.putIfAbsent(country.getCode(), country.getName());
    }

    private Place findPlace(UUID id) {
        return places.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Place", id));
    }
}
