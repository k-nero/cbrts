package com.equifreight.service;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.CorridorCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.route.CorridorResponse;
import com.equifreight.model.route.CreateCorridorRequest;
import com.equifreight.model.route.RouteMapper;
import com.equifreight.repository.BorderCrossingRepository;
import com.equifreight.repository.CorridorCrossingRepository;
import com.equifreight.repository.CorridorRepository;
import com.equifreight.repository.PlaceRepository;
import com.equifreight.repository.VehicleRepository;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The routes we run, as the fleet & route coordinator and the logistics manager manage them: the coordinator adds a
 * route with its border crossings, and either sets how far a request's flexible dates can move on it (#115). A
 * flex change applies to drafts at once and to every request submitted after it; a submitted request keeps the value
 * it was submitted with. A new route has no rates until the transport specialist prices it in the draft rate version.
 */
@Service
public class CorridorService {

    static final String ENTITY_TYPE = "CORRIDOR";
    /** audit_log.entity_code is varchar(20); a longer corridor code is named in the summary only. */
    private static final int AUDIT_CODE_MAX = 20;

    private final CorridorRepository corridors;
    private final CorridorCrossingRepository corridorCrossings;
    private final PlaceRepository places;
    private final BorderCrossingRepository crossings;
    private final AuditService audit;
    private final VehicleRepository vehicles;

    public CorridorService(
            CorridorRepository corridors,
            CorridorCrossingRepository corridorCrossings,
            PlaceRepository places,
            BorderCrossingRepository crossings,
            AuditService audit,
            VehicleRepository vehicles) {
        this.corridors = corridors;
        this.corridorCrossings = corridorCrossings;
        this.places = places;
        this.crossings = crossings;
        this.audit = audit;
        this.vehicles = vehicles;
    }

    @Transactional(readOnly = true)
    public Page<CorridorResponse> list(Pageable pageable) {
        Page<Corridor> page = corridors.findAll(pageable);
        Map<UUID, List<String>> names = crossingNames(page.map(Corridor::getId).getContent());
        Map<UUID, Long> running = new HashMap<>();
        for (Object[] row :
                vehicles.countRunningByCorridor(page.map(Corridor::getId).getContent())) {
            running.put((UUID) row[0], (Long) row[1]);
        }
        return page.map(c -> RouteMapper.toCorridorResponse(
                c, names.getOrDefault(c.getId(), List.of()), c.isRoad() ? running.getOrDefault(c.getId(), 0L) : null));
    }

    /**
     * Adds a route we run. The code is new, the cities differ, the route doesn't already run this way by this mode,
     * each city has a place a request can start or end at, and a road route's crossings lead from the origin's
     * country to the destination's, one after the other. An air route takes no land crossings.
     */
    @Transactional
    public CorridorResponse create(User actor, CreateCorridorRequest request) {
        String code = request.code().trim();
        String origin = request.originCity().trim();
        String destination = request.destinationCity().trim();
        if (origin.equalsIgnoreCase(destination)) {
            throw new BusinessException(
                    "CORRIDOR_CITIES", "A route runs between two cities; both ends are " + origin + ".");
        }
        checkFlex(request.dateFlexDays());
        if (corridors.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("CORRIDOR_CODE", "The code " + code + " is already used. Pick another.");
        }
        if (corridors.existsByModeAndOriginCityIgnoreCaseAndDestinationCityIgnoreCase(
                request.mode(), origin, destination)) {
            throw new ConflictException(
                    "CORRIDOR_EXISTS",
                    "We already run " + origin + " → " + destination + " by " + modeWord(request.mode())
                            + ". Edit that route instead.");
        }
        Country from = countryOf(origin);
        Country to = countryOf(destination);
        List<BorderCrossing> route = orderedCrossings(request.crossingIds());
        if (request.mode() == TransportMode.AIR && !route.isEmpty()) {
            throw new BusinessException(
                    "CORRIDOR_CROSSINGS", "An air route crosses no land border. Remove its border crossings.");
        }
        if (request.mode() == TransportMode.ROAD) {
            checkChain(route, from, to);
        }

        Corridor corridor = new Corridor();
        corridor.setCode(code);
        corridor.setMode(request.mode());
        corridor.setOriginCity(origin);
        corridor.setDestinationCity(destination);
        corridor.setDistanceKm(request.distanceKm());
        corridor.setDateFlexDays(request.dateFlexDays().shortValue());
        corridor.setOriginCountry(from);
        corridor.setDestinationCountry(to);
        for (int i = 0; i < route.size(); i++) {
            CorridorCrossing cc = new CorridorCrossing();
            cc.setCorridor(corridor);
            cc.setSeq((short) (i + 1));
            cc.setBorderCrossing(route.get(i));
            corridor.getCrossings().add(cc);
        }
        Corridor saved = corridors.saveAndFlush(corridor);
        List<String> names = route.stream().map(BorderCrossing::getName).toList();
        audit.recordDecision(
                actor,
                "CORRIDOR_CREATED",
                "Added route " + code + ": " + origin + " → " + destination + " by " + modeWord(request.mode())
                        + (names.isEmpty() ? "" : ", via " + String.join(", ", names)) + ".",
                ENTITY_TYPE,
                saved.getId(),
                code.length() <= AUDIT_CODE_MAX ? code : null,
                null,
                null,
                null);
        return RouteMapper.toCorridorResponse(saved, names);
    }

    /** Sets the route's flex days and writes the decision to the audit log; the same value changes nothing. */
    @Transactional
    public CorridorResponse setDateFlexDays(User actor, UUID id, int days) {
        Corridor corridor = corridors.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Corridor", id));
        checkFlex(days);
        List<String> names = crossingNames(List.of(id)).getOrDefault(id, List.of());
        int before = corridor.getDateFlexDays();
        if (before == days) {
            return RouteMapper.toCorridorResponse(corridor, names);
        }
        corridor.setDateFlexDays((short) days);
        Corridor saved = corridors.save(corridor);
        audit.recordDecision(
                actor,
                "CORRIDOR_DATE_FLEX_CHANGED",
                "Flexible dates on " + corridor.getCode() + ": " + words(before) + " → " + words(days) + ".",
                ENTITY_TYPE,
                saved.getId(),
                corridor.getCode().length() <= AUDIT_CODE_MAX ? corridor.getCode() : null,
                null,
                "{\"dateFlexDays\":" + before + "}",
                "{\"dateFlexDays\":" + days + "}");
        return RouteMapper.toCorridorResponse(saved, names);
    }

    private static void checkFlex(int days) {
        if (days < 0 || days > LeadTimePolicy.MAX_FLEX_DAYS) {
            throw new BusinessException(
                    "DATE_FLEX",
                    "A route's dates can move by 0 to " + LeadTimePolicy.MAX_FLEX_DAYS + " days; " + days
                            + " was given.");
        }
    }

    /** Each corridor's crossing names in order, from one query. */
    private Map<UUID, List<String>> crossingNames(List<UUID> corridorIds) {
        if (corridorIds.isEmpty()) return Map.of();
        return corridorCrossings.findWithCrossingByCorridorIdIn(corridorIds).stream()
                .collect(Collectors.groupingBy(
                        cc -> cc.getCorridor().getId(),
                        Collectors.mapping(cc -> cc.getBorderCrossing().getName(), Collectors.toList())));
    }

    /**
     * The country of a city's places. A request finds its route from the city of its pickup and delivery places, so a
     * city without a place (a welfare stop doesn't count) can't be an end of a route yet.
     */
    private Country countryOf(String city) {
        List<Place> inCity = places.findByCityIgnoreCase(city).stream()
                .filter(p -> p.getKind() != PlaceKind.WELFARE_STOP)
                .toList();
        if (inCity.isEmpty()) {
            throw new BusinessException(
                    "CORRIDOR_PLACE",
                    "No place in " + city + " yet. Add a pickup or delivery place there first: a request finds its"
                            + " route from the city of its places.");
        }
        return inCity.getFirst().getCountry();
    }

    /** The chosen crossings in the order given; an unknown or repeated one is refused. */
    private List<BorderCrossing> orderedCrossings(List<UUID> ids) {
        if (ids.isEmpty()) return List.of();
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new BusinessException("CORRIDOR_CROSSINGS", "A route takes each border crossing once.");
        }
        Map<UUID, BorderCrossing> byId = crossings.findByIdIn(new LinkedHashSet<>(ids)).stream()
                .collect(Collectors.toMap(BorderCrossing::getId, Function.identity()));
        return ids.stream()
                .map(id -> {
                    BorderCrossing c = byId.get(id);
                    if (c == null) throw ResourceNotFoundException.of("Border crossing", id);
                    return c;
                })
                .toList();
    }

    /**
     * A road route's crossings lead from the origin's country to the destination's: each starts in the country the
     * one before it ended in. A crossing can be taken in either direction.
     */
    static void checkChain(List<BorderCrossing> route, Country origin, Country destination) {
        Country at = origin;
        Set<UUID> visited = new HashSet<>();
        visited.add(at.getId());
        for (BorderCrossing c : route) {
            Country next;
            if (c.getFromCountry().getId().equals(at.getId())) next = c.getToCountry();
            else if (c.getToCountry().getId().equals(at.getId())) next = c.getFromCountry();
            else {
                throw new BusinessException(
                        "CORRIDOR_CROSSINGS",
                        c.getName() + " joins " + c.getFromCountry().getName() + " and "
                                + c.getToCountry().getName() + ", but the route is in " + at.getName()
                                + " at that point. Put the crossings in order from the origin.");
            }
            if (!visited.add(next.getId())) {
                throw new BusinessException(
                        "CORRIDOR_CROSSINGS", "The route enters " + next.getName() + " twice. Remove the detour.");
            }
            at = next;
        }
        if (!at.getId().equals(destination.getId())) {
            throw new BusinessException(
                    "CORRIDOR_CROSSINGS",
                    route.isEmpty()
                            ? "The route leaves " + origin.getName() + " for " + destination.getName()
                                    + ". Add the border crossings it takes."
                            : "After its crossings the route is in " + at.getName() + ", but the destination is in "
                                    + destination.getName() + ". Add the crossing into " + destination.getName()
                                    + ".");
        }
    }

    private static String modeWord(TransportMode mode) {
        return mode == TransportMode.AIR ? "air" : "road";
    }

    /** "±3 days", "±1 day", "fixed dates only". */
    static String words(int days) {
        return days == 0 ? "fixed dates only" : "±" + days + (days == 1 ? " day" : " days");
    }
}
