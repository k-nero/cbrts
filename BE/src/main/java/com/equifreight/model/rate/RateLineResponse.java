package com.equifreight.model.rate;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.TrailerType;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Builder;

/** A catalog line; everyCorridor when it applies to every corridor. */
@Builder
public record RateLineResponse(
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
        boolean everyCorridor) {}
