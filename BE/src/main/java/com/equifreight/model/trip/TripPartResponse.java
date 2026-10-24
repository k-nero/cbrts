package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * One part of a job that an incident split across trips (US-F5-06): which of its horses are on that trip, where the
 * part stands and when it is planned to leave and arrive. {@code tripCode} is for staff and the crew; the customer
 * tells parts apart by their horses.
 */
public record TripPartResponse(
        UUID tripId,
        String tripCode,
        TripStatus status,
        List<String> horses,
        /** Horses of this part left at a clinic or stable, not travelling on. */
        List<String> leftInCare,
        Instant plannedDepartureAt,
        Instant plannedArrivalAt,
        /** True for the part this view shows. */
        boolean current) {}
