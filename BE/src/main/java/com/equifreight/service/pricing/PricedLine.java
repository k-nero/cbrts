package com.equifreight.service.pricing;

import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import com.equifreight.entity.enums.RateBasis;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * A priced quotation line. {@code unitRate} and {@code amount} are null on a "No rate" line (source MANUAL).
 * {@code lineKey} names the line across re-prices and revisions, where catalog line ids change: the rate line's code
 * (plus the horse for a per-day line of one horse), {@code STALL}, {@code MISSING:n} or {@code MANUAL:uuid}.
 */
public record PricedLine(
        String group,
        String lineKey,
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
