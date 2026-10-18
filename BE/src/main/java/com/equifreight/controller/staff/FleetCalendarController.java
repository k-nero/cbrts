package com.equifreight.controller.staff;

import com.equifreight.model.fleet.VehicleBookingResponse;
import com.equifreight.service.VehicleService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@RestController
@RequestMapping("/api/v1/staff/fleet-calendar")
public class FleetCalendarController {

    private final VehicleService vehicleService;

    public FleetCalendarController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    /**
     * US-F3-07: Fleet calendar - schedule and bookings.
     */
    @GetMapping
    public List<VehicleBookingResponse> getCalendar(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {

        Instant rangeStart = from != null ? from : Instant.now().minus(7, ChronoUnit.DAYS);
        Instant rangeEnd = to != null ? to : Instant.now().plus(30, ChronoUnit.DAYS);

        return vehicleService.getFleetCalendar(rangeStart, rangeEnd);
    }
}
