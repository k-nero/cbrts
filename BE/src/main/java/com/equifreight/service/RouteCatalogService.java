package com.equifreight.service;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.route.BorderCrossingResponse;
import com.equifreight.model.route.CountryOptionResponse;
import com.equifreight.model.route.CreateBorderCrossingRequest;
import com.equifreight.model.route.CreatePlaceRequest;
import com.equifreight.model.route.PlaceResponse;
import com.equifreight.model.route.RouteMapper;
import com.equifreight.repository.BorderCrossingRepository;
import com.equifreight.repository.CountryRepository;
import com.equifreight.repository.PlaceRepository;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The fleet & route coordinator's route catalog beyond the corridors themselves: the places a request can start or
 * end at, and the border crossings a road route takes. Countries are added by the transport specialist with their
 * regulation catalog (US-F2-12); here they are only read.
 */
@Service
public class RouteCatalogService {

    private static final int AUDIT_CODE_MAX = 20;

    private final PlaceRepository places;
    private final BorderCrossingRepository crossings;
    private final CountryRepository countries;
    private final AuditService audit;
    private final CatalogUsage usage;

    public RouteCatalogService(
            PlaceRepository places,
            BorderCrossingRepository crossings,
            CountryRepository countries,
            AuditService audit,
            CatalogUsage usage) {
        this.places = places;
        this.crossings = crossings;
        this.countries = countries;
        this.audit = audit;
        this.usage = usage;
    }

    /** Every country we serve, by name. */
    @Transactional(readOnly = true)
    public List<CountryOptionResponse> countries() {
        return countries.findAll(Sort.by("name")).stream()
                .map(RouteMapper::toCountryOption)
                .toList();
    }

    /** Adds a place; a second place with the same name in the same city is refused. */
    @Transactional
    public PlaceResponse createPlace(User actor, CreatePlaceRequest request) {
        String name = request.name().trim();
        String city = request.city().trim();
        Country country = country(request.countryId());
        if (places.existsByNameIgnoreCaseAndCityIgnoreCase(name, city)) {
            throw new ConflictException("PLACE_EXISTS", city + " already has a place called " + name + ".");
        }
        Place place = new Place();
        place.setName(name);
        place.setKind(request.kind());
        place.setCity(city);
        place.setCountry(country);
        place.setAddress(blankToNull(request.address()));
        Place saved = places.saveAndFlush(place);
        audit.recordDecision(
                actor,
                "PLACE_CREATED",
                "Added place " + name + " in " + city + ", " + country.getName() + ".",
                "PLACE",
                saved.getId(),
                null,
                null,
                null,
                null);
        return RouteMapper.toResponse(saved);
    }

    /** Adds a border crossing between two different countries; names are unique. */
    @Transactional
    public BorderCrossingResponse createBorderCrossing(User actor, CreateBorderCrossingRequest request) {
        String name = request.name().trim();
        if (request.fromCountryId().equals(request.toCountryId())) {
            throw new BusinessException("CROSSING_COUNTRIES", "A border crossing joins two different countries.");
        }
        Country from = country(request.fromCountryId());
        Country to = country(request.toCountryId());
        if (crossings.existsByNameIgnoreCase(name)) {
            throw new ConflictException("CROSSING_EXISTS", "A border crossing called " + name + " already exists.");
        }
        BorderCrossing crossing = new BorderCrossing();
        crossing.setName(name);
        crossing.setFromCountry(from);
        crossing.setToCountry(to);
        crossing.setRoadOnly(request.roadOnly());
        BorderCrossing saved = crossings.saveAndFlush(crossing);
        audit.recordDecision(
                actor,
                "BORDER_CROSSING_CREATED",
                "Added border crossing " + name + " between " + from.getName() + " and " + to.getName() + ".",
                "BORDER_CROSSING",
                saved.getId(),
                name.length() <= AUDIT_CODE_MAX ? name : null,
                null,
                null,
                null);
        return RouteMapper.toBorderCrossingResponse(saved);
    }

    /**
     * Edits a place. Its name stays unique in its city. Moving it to another city or country is refused while a
     * request, a route plan or a quarantine uses it, and neither a move nor making it a welfare stop may leave a city a
     * route or a vehicle needs without a place.
     */
    @Transactional
    public PlaceResponse updatePlace(User actor, UUID id, CreatePlaceRequest request) {
        Place place = places.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Place", id));
        String name = request.name().trim();
        String city = request.city().trim();
        Country country = country(request.countryId());
        if (places.existsByNameIgnoreCaseAndCityIgnoreCaseAndIdNot(name, city, id)) {
            throw new ConflictException("PLACE_EXISTS", city + " already has a place called " + name + ".");
        }
        boolean moves = !city.equalsIgnoreCase(Objects.toString(place.getCity(), ""))
                || !country.getId().equals(place.getCountry().getId());
        if (moves) {
            usage.placeInUse(place).ifPresent(reason -> {
                throw new ConflictException("PLACE_IN_USE", reason + " It stays in " + place.getCity() + ".");
            });
        }
        if (moves || request.kind() == PlaceKind.WELFARE_STOP) {
            usage.lastPlaceOfCity(place).ifPresent(reason -> {
                throw new ConflictException("PLACE_LAST_IN_CITY", reason);
            });
        }
        String before = placeText(place);
        place.setName(name);
        place.setKind(request.kind());
        place.setCity(city);
        place.setCountry(country);
        place.setAddress(blankToNull(request.address()));
        Place saved = places.saveAndFlush(place);
        String after = placeText(saved);
        if (!before.equals(after)) {
            audit.recordDecision(
                    actor,
                    "PLACE_UPDATED",
                    "Edited place: " + before + " → " + after + ".",
                    "PLACE",
                    id,
                    null,
                    null,
                    null,
                    null);
        }
        return RouteMapper.toResponse(saved);
    }

    /** Deletes a place nothing uses, unless it is the last one in a city a route or a vehicle needs. */
    @Transactional
    public void deletePlace(User actor, UUID id) {
        Place place = places.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Place", id));
        usage.placeInUse(place).or(() -> usage.lastPlaceOfCity(place)).ifPresent(reason -> {
            throw new ConflictException("PLACE_IN_USE", reason);
        });
        String text = placeText(place);
        places.delete(place);
        places.flush();
        audit.recordDecision(
                actor, "PLACE_DELETED", "Deleted place " + text + ".", "PLACE", id, null, null, null, null);
    }

    /**
     * Edits a border crossing. Its name stays unique; the countries it joins can change only while no route takes it,
     * no route plan stops at it and no checklist names it.
     */
    @Transactional
    public BorderCrossingResponse updateBorderCrossing(User actor, UUID id, CreateBorderCrossingRequest request) {
        BorderCrossing crossing =
                crossings.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Border crossing", id));
        String name = request.name().trim();
        if (request.fromCountryId().equals(request.toCountryId())) {
            throw new BusinessException("CROSSING_COUNTRIES", "A border crossing joins two different countries.");
        }
        Country from = country(request.fromCountryId());
        Country to = country(request.toCountryId());
        if (crossings.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ConflictException("CROSSING_EXISTS", "A border crossing called " + name + " already exists.");
        }
        boolean moves = !Set.of(from.getId(), to.getId())
                .equals(Set.of(
                        crossing.getFromCountry().getId(),
                        crossing.getToCountry().getId()));
        if (moves) {
            usage.crossingInUse(crossing).ifPresent(reason -> {
                throw new ConflictException("CROSSING_IN_USE", reason + " Its countries stay as they are.");
            });
        }
        String before = crossingText(crossing);
        crossing.setName(name);
        crossing.setFromCountry(from);
        crossing.setToCountry(to);
        crossing.setRoadOnly(request.roadOnly());
        BorderCrossing saved = crossings.saveAndFlush(crossing);
        String after = crossingText(saved);
        if (!before.equals(after)) {
            audit.recordDecision(
                    actor,
                    "BORDER_CROSSING_UPDATED",
                    "Edited border crossing: " + before + " → " + after + ".",
                    "BORDER_CROSSING",
                    id,
                    name.length() <= AUDIT_CODE_MAX ? name : null,
                    null,
                    null,
                    null);
        }
        return RouteMapper.toBorderCrossingResponse(saved);
    }

    /** Deletes a border crossing no route takes, no route plan stops at and no checklist names. */
    @Transactional
    public void deleteBorderCrossing(User actor, UUID id) {
        BorderCrossing crossing =
                crossings.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Border crossing", id));
        usage.crossingInUse(crossing).ifPresent(reason -> {
            throw new ConflictException("CROSSING_IN_USE", reason);
        });
        String name = crossing.getName();
        String text = crossingText(crossing);
        crossings.delete(crossing);
        crossings.flush();
        audit.recordDecision(
                actor,
                "BORDER_CROSSING_DELETED",
                "Deleted border crossing " + text + ".",
                "BORDER_CROSSING",
                id,
                name.length() <= AUDIT_CODE_MAX ? name : null,
                null,
                null,
                null);
    }

    /** "Phú Thọ (Racecourse) in Ho Chi Minh City, Vietnam", for the audit log. */
    private static String placeText(Place p) {
        return p.getName() + " (" + p.getKind() + ") in " + p.getCity() + ", "
                + p.getCountry().getName();
    }

    /** "Mộc Bài – Bavet, Vietnam – Cambodia, road only", for the audit log. */
    private static String crossingText(BorderCrossing c) {
        return c.getName() + ", " + c.getFromCountry().getName() + " – "
                + c.getToCountry().getName() + (c.isRoadOnly() ? ", road only" : "");
    }

    private Country country(UUID id) {
        return countries.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Country", id));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
