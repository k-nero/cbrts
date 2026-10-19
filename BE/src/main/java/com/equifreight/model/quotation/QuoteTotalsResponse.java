package com.equifreight.model.quotation;

import java.math.BigDecimal;
import java.util.List;
import lombok.Builder;

/** The totals in the fixed order; subtotal and total are null while anything is missing. */
@Builder
public record QuoteTotalsResponse(
        BigDecimal pricedLines, BigDecimal subtotal, List<QuoteTotalRowResponse> rows, BigDecimal total) {}
