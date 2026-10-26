package com.equifreight.model.review;

import java.time.LocalDate;
import lombok.Builder;

/**
 * Whether the fleet can run a request (US-F7-02), on the Request review page, "by the fleet calendar".
 *
 * <p>{@code outcome}: {@code FREE} a vehicle can start on the requested date; {@code WITHIN_FLEX} one can within the
 * request's flexible days; {@code NONE} none can in that time ({@code earliest} is the first date one can, if any in
 * the next {@code horizonDays}); {@code NO_VEHICLE} nobody works the corridor; {@code FLOWN} an air route, which
 * carries no vehicle. {@code message} says it in one sentence. {@code heldVehicle} and {@code heldFrom} name the
 * vehicle held for the request once the customer has accepted; {@code held} is false after acceptance when none is.
 */
@Builder
public record FleetCheckResponse(
        String outcome,
        String message,
        String vehicleCode,
        LocalDate date,
        LocalDate earliest,
        Boolean held,
        String heldVehicle,
        LocalDate heldFrom) {}
