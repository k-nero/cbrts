package com.equifreight.model.rate;

import java.math.BigDecimal;
import lombok.Builder;

/** A volume break band; maxHorses null is open-ended. */
@Builder
public record VolumeBreakResponse(short minHorses, Short maxHorses, BigDecimal discountPct) {}
