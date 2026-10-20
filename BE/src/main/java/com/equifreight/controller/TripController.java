package com.equifreight.controller;

import com.equifreight.entity.User;
import com.equifreight.model.trip.TripRecordRequest;
import com.equifreight.model.trip.TripRecordResponse;
import com.equifreight.model.trip.TripSummaryResponse;
import com.equifreight.model.trip.TripViewResponse;
import com.equifreight.service.TripService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class TripController {
    private final TripService trips;

    public TripController(TripService trips) {
        this.trips = trips;
    }

    /**
     * The lists are constructor queries, so a client-chosen sort on a field they don't select is a 500: keep the
     * page and size from the request and always use the list's own order.
     */
    private static Pageable sorted(Pageable requested, Sort order) {
        return PageRequest.of(requested.getPageNumber(), requested.getPageSize(), order);
    }

    @GetMapping("/api/v1/escort/trips")
    @PreAuthorize("hasRole('ESCORT')")
    public Page<TripSummaryResponse> escortTrips(
            @AuthenticationPrincipal User user, @PageableDefault(size = 20) Pageable pageable) {
        return trips.escortTrips(user, sorted(pageable, Sort.by(Sort.Direction.DESC, "job.plannedDepartureAt")));
    }

    @GetMapping("/api/v1/escort/trips/{jobCode}")
    @PreAuthorize("hasRole('ESCORT')")
    public TripViewResponse escortTrip(@PathVariable String jobCode, @AuthenticationPrincipal User user) {
        return trips.escortTrip(jobCode, user);
    }

    @PostMapping("/api/v1/escort/trips/{jobCode}/records")
    @PreAuthorize("hasRole('ESCORT')")
    public TripRecordResponse escortRecord(
            @PathVariable String jobCode,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody TripRecordRequest request) {
        return trips.addEscortRecord(jobCode, user, request);
    }

    @GetMapping("/api/v1/staff/trips")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public Page<TripSummaryResponse> coordinatorTrips(@PageableDefault(size = 20) Pageable pageable) {
        return trips.coordinatorTrips(sorted(pageable, Sort.by("plannedDepartureAt")));
    }

    @GetMapping("/api/v1/staff/trips/{jobCode}")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripViewResponse coordinatorTrip(@PathVariable String jobCode) {
        return trips.coordinatorTrip(jobCode);
    }

    @PostMapping("/api/v1/staff/trips/{jobCode}/records")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public TripRecordResponse coordinatorRecord(
            @PathVariable String jobCode,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody TripRecordRequest request) {
        return trips.addCoordinatorRecord(jobCode, user, request);
    }

    @GetMapping("/api/v1/customer/trips")
    @PreAuthorize("hasRole('CUSTOMER')")
    public Page<TripSummaryResponse> customerTrips(
            @AuthenticationPrincipal User user, @PageableDefault(size = 20) Pageable pageable) {
        return trips.customerTrips(user, sorted(pageable, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/api/v1/customer/trips/{jobCode}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public TripViewResponse customerTrip(@PathVariable String jobCode, @AuthenticationPrincipal User user) {
        return trips.customerTrip(jobCode, user);
    }
}
