package com.equifreight.model.quotation;

import java.math.BigDecimal;

/** The deposit fixed at issue: the pinned catalog's percentage of the total (US-Q-08). */
public record DepositResponse(BigDecimal pct, BigDecimal amount) {}
