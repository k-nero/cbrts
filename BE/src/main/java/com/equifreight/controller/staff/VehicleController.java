package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.fleet.*;
import com.equifreight.service.VehicleService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/staff/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    /**
     * US-F3-02: Manage fleet - list vehicles.
     */
    @GetMapping
    public Page<VehicleResponse> list(
            @PageableDefault(size = 20, sort = "code", direction = Sort.Direction.ASC) Pageable pageable) {
        return vehicleService.search(null, pageable);
    }

    /**
     * Active vehicles for dropdowns. With {@code jobId}, for that job's trip ({@code tripId}, or its current one):
     * each says whether it may join the trip and why not, those that may first (US-F7-01).
     */
    @GetMapping("/active")
    public List<VehicleResponse> listActive(
            @RequestParam(required = false) UUID jobId, @RequestParam(required = false) UUID tripId) {
        return jobId == null ? vehicleService.listAllActive() : vehicleService.listForTrip(jobId, tripId);
    }

    @GetMapping("/{id}")
    public VehicleResponse get(@PathVariable UUID id) {
        return vehicleService.get(id);
    }

    /**
     * US-F3-02: Add new vehicle with stalls.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public VehicleResponse create(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateVehicleRequest request) {
        return vehicleService.create(user, request);
    }

    /**
     * US-F3-02, US-F7-01: Update vehicle payload, status, home country, permits or operating corridors.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public VehicleResponse update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVehicleRequest request) {
        return vehicleService.update(user, id, request);
    }

    /**
     * US-F3-04: Book vehicle without double booking.
     */
    @PostMapping("/bookings")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public VehicleBookingResponse bookVehicle(@Valid @RequestBody VehicleBookingRequest request) {
        return vehicleService.bookVehicle(request);
    }
}
