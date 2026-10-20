package com.equifreight.model.rate;

import java.math.BigDecimal;
import lombok.Builder;

/** One volume break band; maxHorses null makes it open-ended. */
@Builder
public record VolumeBreakRequest(Short minHorses, Short maxHorses, BigDecimal discountPct) {}
