package com.equifreight.model.quotation;

import com.equifreight.entity.enums.QuotationStatus;
import java.math.BigDecimal;
import java.time.Instant;

/** One version of a request's quotation, for the versions list (US-Q-07). */
public record QuotationVersionResponse(
        short versionNo,
        QuotationStatus status,
        Instant issuedAt,
        Instant validUntil,
        BigDecimal total,
        String supersededReason) {}
