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
        boolean weightsRequired,
        /** The domestic road legs to and from hubs (US-F1-09); empty for a move a corridor joins. */
        List<RoadLeg> legs) {

    public PricingInput {
        legs = legs == null ? List.of() : List.copyOf(legs);
    }

    /** A move between two cities a corridor joins: no domestic legs. */
    public PricingInput(
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
            boolean arrivalWindow,
            boolean weightsRequired) {
        this(
                mode,
                corridorCode,
                fromCity,
                toCity,
                destinationCountryName,
                distanceKm,
                crossingCount,
                airClass,
                trailer,
                insurance,
                vetEscort,
                quarantineDays,
                horses,
                arrivalWindow,
                weightsRequired,
                List.of());
    }

    /** The trailer a domestic leg is priced with: the request's, or a private trailer on a move that flies. */
    public TrailerType legTrailer() {
        return trailer == null ? TrailerType.PRIVATE : trailer;
    }
}
