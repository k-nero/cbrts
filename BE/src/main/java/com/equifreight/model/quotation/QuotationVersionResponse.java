package com.equifreight.model.quotation;

import com.equifreight.entity.enums.QuotationStatus;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * One version of a request's quotation, for the versions list (US-Q-07).
 *
 * @param declinedAt when the customer declined this version; null unless declined (a decline is final, so the
 *     builder closes the draft after it)
 * @param declineReason the customer's reason; null when none was given
 */
public record QuotationVersionResponse(
        short versionNo,
        QuotationStatus status,
        Instant issuedAt,
        Instant validUntil,
        BigDecimal total,
        String supersededReason,
        Instant declinedAt,
        String declineReason) {}
