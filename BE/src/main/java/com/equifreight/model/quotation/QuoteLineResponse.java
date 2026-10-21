package com.equifreight.model.quotation;

import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Builder;

/**
 * A quotation line; unitRate and amount are null on a "No rate" line. {@code amount} is the override when there is
 * one, and {@code catalogAmount} keeps what the catalog gave (US-Q-02). {@code manual} marks a line the manager added.
 */
@Builder
public record QuoteLineResponse(
        UUID id,
        String lineKey,
        String description,
        String basisText,
        BigDecimal quantity,
        BigDecimal unitRate,
        BigDecimal amount,
        LineCertainty certainty,
        String estimateNote,
        LineSource source,
        BigDecimal catalogAmount,
        BigDecimal overrideAmount,
        String overrideReason,
        boolean manual,
        String manualReason) {}
