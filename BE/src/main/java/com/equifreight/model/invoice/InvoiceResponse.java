package com.equifreight.model.invoice;

import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * An invoice with its lines and payments (US-F6-03). A deposit invoice has one line; a final invoice the accepted
 * quotation settled against what happened: each line as quoted or actual, the costs approved on incidents, the late
 * arrival credit, then the deposit deducted.
 */
@Builder
public record InvoiceResponse(
        UUID id,
        String code,
        InvoiceKind kind,
        InvoiceStatus status,
        String clubName,
        UUID requestId,
        String requestCode,
        UUID jobId,
        String jobCode,
        String quotationCode,
        int quotationVersion,
        BigDecimal quotationTotal,
        String currency,
        Instant issuedAt,
        String issuedByName,
        LocalDate dueOn,
        boolean overdue,
        BigDecimal subtotal,
        BigDecimal taxPct,
        BigDecimal taxAmount,
        BigDecimal total,
        BigDecimal amountPaid,
        BigDecimal amountDue,
        List<InvoiceLineResponse> lines,
        List<PaymentResponse> payments) {}
