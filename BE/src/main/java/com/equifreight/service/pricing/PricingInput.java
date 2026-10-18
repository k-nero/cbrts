package com.equifreight.service.pricing;

import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.util.List;

/**
 * Everything the price is derived from (spec §4.1). Cities and the destination country come from the request's
 * places, because a corridor may be used in reverse. {@code quarantineDays} is null when the destination has no
 * published regulation version.
 */
public record PricingInput(
        TransportMode mode,
        String corridorCode,
        String fromCity,
        String toCity,
        String destinationCountryName,
        int distanceKm,
        int crossingCount,
        ServiceClass airClass,
        TrailerType trailer,
        InsuranceOption insurance,
        boolean vetEscort,
        Integer quarantineDays,
        List<PricingHorse> horses) {}
