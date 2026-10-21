package com.equifreight.model.quotation;

import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import java.math.BigDecimal;
import lombok.Builder;

/** A quotation line; unitRate and amount are null on a "No rate" line. */
@Builder
public record QuoteLineResponse(
        String description,
        String basisText,
        BigDecimal quantity,
        BigDecimal unitRate,
        BigDecimal amount,
        LineCertainty certainty,
        String estimateNote,
        LineSource source) {}
