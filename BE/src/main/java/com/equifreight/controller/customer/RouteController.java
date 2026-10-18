package com.equifreight.controller.customer;

import com.equifreight.model.route.PlaceResponse;
import com.equifreight.model.route.RouteResponse;
import com.equifreight.service.RouteService;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The catalog reads the request wizard's route step needs. */
@RestController
@RequestMapping("/api/v1/customer")
public class RouteController {

    private final RouteService routeService;

    public RouteController(RouteService routeService) {
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
        return routeService.places(q, pageable);
    }

    /** An empty list is a route we don't run; without {@code to}, the routes we run from the origin's city. */
    @GetMapping("/routes")
    public List<RouteResponse> routes(
            @RequestParam("from") UUID from, @RequestParam(value = "to", required = false) UUID to) {
        return routeService.routes(from, to);
    }
}
