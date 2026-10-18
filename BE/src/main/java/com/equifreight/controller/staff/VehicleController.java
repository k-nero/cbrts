package com.equifreight.controller.staff;

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
     * Active vehicles for dropdowns.
     */
    @GetMapping("/active")
    public List<VehicleResponse> listActive() {
        return vehicleService.listAllActive();
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
    public VehicleResponse create(@Valid @RequestBody CreateVehicleRequest request) {
        return vehicleService.create(request);
    }

    /**
     * US-F3-02: Update vehicle payload or status.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('FLEET_COORDINATOR', 'LOGISTICS_MANAGER')")
    public VehicleResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateVehicleRequest request) {
        return vehicleService.update(id, request);
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
