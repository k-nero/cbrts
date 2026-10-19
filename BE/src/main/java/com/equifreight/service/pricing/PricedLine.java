package com.equifreight.service.pricing;

import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import com.equifreight.entity.enums.RateBasis;
import java.math.BigDecimal;
import java.util.UUID;

/** A priced quotation line. {@code unitRate} and {@code amount} are null on a "No rate" line (source MANUAL). */
public record PricedLine(
        String group,
        String description,
        RateBasis basis,
        String basisText,
        BigDecimal quantity,
        BigDecimal unitRate,
        BigDecimal amount,
        LineSource source,
        UUID rateLineId,
        UUID rateServiceClassId,
        UUID horseId,
        LineCertainty certainty,
        String estimateNote) {}
