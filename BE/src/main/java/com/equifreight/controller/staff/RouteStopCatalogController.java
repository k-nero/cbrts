package com.equifreight.controller.staff;

import com.equifreight.model.route.BorderCrossingResponse;
import com.equifreight.model.route.PlaceResponse;
import com.equifreight.service.RouteService;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * What a route plan's stops can be (US-F3-17): every catalogued place, airports, quarantine stations and welfare stops
 * included, and the border crossings. Any staff member can read them.
 */
@RestController
@RequestMapping("/api/v1/staff")
public class RouteStopCatalogController {

    private final RouteService routeService;

    public RouteStopCatalogController(RouteService routeService) {
        this.routeService = routeService;
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
}
