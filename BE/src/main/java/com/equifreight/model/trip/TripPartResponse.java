package com.equifreight.model.trip;

import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.TripStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * One part of a job that spans trips: split by an incident (US-F5-06), or planned as a chain of trips (US-F3-16).
 * Which of its horses are on that trip, where the part stands and when it is planned to leave and arrive.
 * {@code tripCode} is for staff and the crew; the customer tells parts apart by their horses and their route.
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
        boolean current,
        /** The trip's catalog corridor, "RD VTE → BKK", and so whether it drives or flies. */
        String corridorCode,
        TransportMode mode,
        /** True when this part hands its horses on to the next trip of the job's chain (US-F3-16). */
        boolean handsOn) {}
