package com.equifreight.service.pricing;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.TrailerType;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * A catalog line the engine can expand; {@code everyCorridor} when it has no corridor of its own. A line
 * {@code coveredByRoadLeg} (US-F3-21) isn't charged at an end of the move a domestic road leg covers: group A at the
 * origin, G at the destination.
 */
public record RateRow(
        UUID id,
        String code,
        String group,
        String description,
        RateBasis basis,
        HorseSex appliesToSex,
        TrailerType appliesToTrailer,
        BigDecimal rate,
        BigDecimal minCharge,
        BigDecimal defaultQuantity,
        RateCertainty certainty,
        String estimateNote,
        boolean everyCorridor,
        boolean coveredByRoadLeg) {

    /** A line charged whatever covers the ends of the move. */
    public RateRow(
            UUID id,
            String code,
            String group,
            String description,
            RateBasis basis,
            HorseSex appliesToSex,
            TrailerType appliesToTrailer,
            BigDecimal rate,
            BigDecimal minCharge,
            BigDecimal defaultQuantity,
            RateCertainty certainty,
            String estimateNote,
            boolean everyCorridor) {
        this(
                id,
                code,
                group,
                description,
                basis,
                appliesToSex,
                appliesToTrailer,
                rate,
                minCharge,
                defaultQuantity,
                certainty,
                estimateNote,
                everyCorridor,
                false);
    }
}
