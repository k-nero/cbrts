package com.equifreight.service.pricing;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.TrailerType;
import java.math.BigDecimal;
import java.util.UUID;

/** A catalog line the engine can expand; {@code everyCorridor} when it has no corridor of its own. */
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
        boolean everyCorridor) {}
