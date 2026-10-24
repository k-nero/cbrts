package com.equifreight.model.invoice;

import com.equifreight.entity.enums.InvoiceLineKind;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Builder;

/** One line of an invoice, as quoted or as it actually happened, with why it changed (US-F6-03). */
@Builder
public record InvoiceLineResponse(
        UUID id,
        int position,
        InvoiceLineKind kind,
        String description,
        BigDecimal quantity,
        BigDecimal unitRate,
        BigDecimal amount,
        String note,
        /** The quotation line it settles, or null for a total row, a charge, the penalty or the deposit. */
        UUID quotationLineId,
        /** What the quotation said, to show the change beside an actual line. */
        BigDecimal quotedQuantity,
        BigDecimal quotedAmount,
        /** An estimated line whose actual quantity the manager sets while the invoice is a draft. */
        boolean actualisable) {}
