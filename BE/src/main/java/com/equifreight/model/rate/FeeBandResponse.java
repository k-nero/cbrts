package com.equifreight.model.rate;

import com.equifreight.entity.enums.FeeBandKind;
import java.math.BigDecimal;
import lombok.Builder;

/** A cancellation or short-notice band, shown read-only in this slice. */
@Builder
public record FeeBandResponse(FeeBandKind kind, short minDays, Short maxDays, BigDecimal value) {}
