package com.equifreight.service.pricing;

import java.math.BigDecimal;
import java.util.List;

/** The totals in the fixed order (spec §4.4); every figure from the subtotal on is null while anything is missing. */
public record PricedTotals(
        BigDecimal pricedLines,
        BigDecimal subtotal,
        BigDecimal volumeBreak,
        BigDecimal fuel,
        BigDecimal insurance,
        BigDecimal contingency,
        BigDecimal serviceFee,
        BigDecimal total,
        List<TotalRow> rows) {}
