package com.equifreight.model.quotation;

import java.math.BigDecimal;
import java.util.List;
import lombok.Builder;

/** A ledger group (A–H); subtotal is null while a line in it has no rate. */
@Builder
public record QuoteGroupResponse(String code, String name, BigDecimal subtotal, List<QuoteLineResponse> lines) {}
