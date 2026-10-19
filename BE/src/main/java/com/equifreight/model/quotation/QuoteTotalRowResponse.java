package com.equifreight.model.quotation;

import java.math.BigDecimal;
import lombok.Builder;

/** A percentage row under the subtotal, naming the base it was taken of. */
@Builder
public record QuoteTotalRowResponse(String key, String label, String baseText, BigDecimal amount) {}
