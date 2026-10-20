package com.equifreight.model.horse;

import java.math.BigDecimal;
import lombok.Builder;

@Builder
public record SizeClassResponse(String code, short widthIn, BigDecimal minHeightHh) {}
