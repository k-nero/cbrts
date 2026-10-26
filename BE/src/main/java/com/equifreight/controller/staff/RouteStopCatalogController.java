package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.route.BorderCrossingResponse;
import com.equifreight.model.route.CountryOptionResponse;
import com.equifreight.model.route.CreateBorderCrossingRequest;
import com.equifreight.model.route.CreatePlaceRequest;
import com.equifreight.model.route.PlaceResponse;
import com.equifreight.service.RouteCatalogService;
import com.equifreight.service.RouteService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * What a route plan's stops can be (US-F3-17): every catalogued place, airports, quarantine stations and welfare stops
 * included, and the border crossings. Any staff member can read them; the fleet & route coordinator adds places and
 * crossings so a new route can be run.
 */
@RestController
@RequestMapping("/api/v1/staff")
public class RouteStopCatalogController {

    private final RouteService routeService;
    private final RouteCatalogService catalog;

    public RouteStopCatalogController(RouteService routeService, RouteCatalogService catalog) {
        this.routeService = routeService;
        this.catalog = catalog;
    }

    // Sortable: name, city.
    @GetMapping("/places")
    public Page<PlaceResponse> places(
            @RequestParam(value = "q", required = false) String q,
            @PageableDefault(
                            size = 20,
                            sort = {"city", "name"},
                            direction = Sort.Direction.ASC)
                    Pageable pageable) {
        return routeService.stopPlaces(q, pageable);
    }

    @GetMapping("/border-crossings")
    public List<BorderCrossingResponse> borderCrossings() {
        return routeService.borderCrossings();
    }

    @PostMapping("/places")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('FLEET_COORDINATOR')")
    public PlaceResponse createPlace(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreatePlaceRequest request) {
        return catalog.createPlace(user, request);
    }

    @PostMapping("/border-crossings")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('FLEET_COORDINATOR')")
    public BorderCrossingResponse createBorderCrossing(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateBorderCrossingRequest request) {
        return catalog.createBorderCrossing(user, request);
    }

    /** Every country we serve, for the place and border crossing forms. */
    @GetMapping("/countries")
    public List<CountryOptionResponse> countries() {
        return catalog.countries();
    }
}
