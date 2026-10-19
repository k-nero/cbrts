package com.equifreight.service.pricing;

import java.math.BigDecimal;

/** A volume break band; {@code maxHorses} null means open-ended (8+). */
public record BreakRow(int minHorses, Integer maxHorses, BigDecimal discountPct) {

    public boolean contains(int horses) {
        return horses >= minHorses && (maxHorses == null || horses <= maxHorses);
    }
}
