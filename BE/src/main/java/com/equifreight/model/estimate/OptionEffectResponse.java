package com.equifreight.model.estimate;

import java.math.BigDecimal;
import lombok.Builder;

/**
 * One wizard choice and how it moves the range: {@code current}, or a signed {@code deltaLow}/{@code deltaHigh},
 * or an {@code exact} figure (insurance), or why it can't be priced.
 */
@Builder
public record OptionEffectResponse(
        String value,
        boolean current,
        BigDecimal deltaLow,
        BigDecimal deltaHigh,
        BigDecimal exact,
        String unavailable) {}
