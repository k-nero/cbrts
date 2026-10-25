package com.equifreight.service.pricing;

import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.util.List;

/**
 * Everything the price is derived from (spec §4.1). Cities and the destination country come from the request's
 * places, because a corridor may be used in reverse. {@code quarantineDays} is null when the destination has no
 * published regulation version, and {@code distanceKm} is null when the corridor has no distance.
 */
public record PricingInput(
        TransportMode mode,
        String corridorCode,
        String fromCity,
        String toCity,
        String destinationCountryName,
        Integer distanceKm,
        int crossingCount,
        ServiceClass airClass,
        TrailerType trailer,
        InsuranceOption insurance,
        boolean vetEscort,
        Integer quarantineDays,
        List<PricingHorse> horses,
        /** The request asks for an arrival window (road, private trailer). */
        boolean arrivalWindow,
        /**
         * A quotation being built or issued needs every horse's weight and the catalog's two weight limits (BR-Q-16).
         * The customer's estimate on a draft, and the final invoice re-totalling an accepted quotation, don't: weight
         * never prices a line.
         */
        boolean weightsRequired) {}
