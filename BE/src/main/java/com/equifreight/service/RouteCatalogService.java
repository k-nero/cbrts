package com.equifreight.service;

import com.equifreight.entity.BorderCrossing;
import com.equifreight.entity.Country;
import com.equifreight.entity.Place;
import com.equifreight.entity.User;
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

    public RouteCatalogService(
            PlaceRepository places,
            BorderCrossingRepository crossings,
            CountryRepository countries,
            AuditService audit) {
        this.places = places;
        this.crossings = crossings;
        this.countries = countries;
        this.audit = audit;
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

    private Country country(UUID id) {
        return countries.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Country", id));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
