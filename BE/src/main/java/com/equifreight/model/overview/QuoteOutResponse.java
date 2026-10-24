package com.equifreight.model.overview;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

/** An issued quotation waiting for the customer's answer (US-R-01): soonest to expire first. */
@Builder
public record QuoteOutResponse(
        UUID requestId,
        String requestCode,
        String club,
        String quotationCode,
        int versionNo,
        BigDecimal total,
        String currency,
        /** The end of its last valid day. */
        Instant validUntil) {}
