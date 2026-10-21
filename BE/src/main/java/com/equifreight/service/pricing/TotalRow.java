package com.equifreight.service.pricing;

import java.math.BigDecimal;

/** One percentage row under the subtotal, naming its base; {@code amount} null while an input is missing. */
public record TotalRow(String key, String label, String baseText, BigDecimal amount) {}
