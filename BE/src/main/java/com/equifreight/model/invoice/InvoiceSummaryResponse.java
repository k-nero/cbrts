package com.equifreight.model.invoice;

import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

/** A row of the Invoices list, and of a request's invoices on the customer's side (US-F6-03). */
@Builder
public record InvoiceSummaryResponse(
        UUID id,
        String code,
        InvoiceKind kind,
        InvoiceStatus status,
        String clubName,
        UUID requestId,
        String requestCode,
        String jobCode,
        String currency,
        BigDecimal total,
        BigDecimal amountDue,
        LocalDate dueOn,
        /** Unpaid past its due day. */
        boolean overdue) {}
