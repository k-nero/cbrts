package com.equifreight.controller.staff;

import com.equifreight.entity.enums.VehicleKind;
import com.equifreight.model.fleet.VehicleBookingResponse;
import com.equifreight.service.VehicleService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff/fleet-calendar")
public class FleetCalendarController {

    private final VehicleService vehicleService;

    public FleetCalendarController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    /**
     * US-F3-07: Fleet calendar - schedule and bookings, with vehicle kind and date range filters.
     */
    @GetMapping
    public List<VehicleBookingResponse> getCalendar(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    Instant from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    Instant to,
            @RequestParam(value = "vehicleKind", required = false) VehicleKind vehicleKind) {

        Instant rangeStart = from != null
                ? from
                : (to != null ? to.minus(30, ChronoUnit.DAYS) : Instant.now().minus(7, ChronoUnit.DAYS));
        Instant rangeEnd = to != null
                ? to
                : (from != null ? from.plus(30, ChronoUnit.DAYS) : Instant.now().plus(30, ChronoUnit.DAYS));

        return vehicleService.getFleetCalendar(rangeStart, rangeEnd, vehicleKind);
    }
}
