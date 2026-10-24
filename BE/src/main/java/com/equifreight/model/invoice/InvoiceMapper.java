package com.equifreight.model.invoice;

import com.equifreight.entity.Invoice;
import com.equifreight.entity.InvoiceLine;
import com.equifreight.entity.Payment;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.enums.InvoiceStatus;
import com.equifreight.entity.enums.LineCertainty;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class InvoiceMapper {

    private InvoiceMapper() {}

    /** What is still owed: the total less what was paid; nothing on a draft or a void invoice. */
    public static BigDecimal amountDue(Invoice i) {
        if (i.getStatus() == InvoiceStatus.DRAFT || i.getStatus() == InvoiceStatus.VOID) return BigDecimal.ZERO;
        return i.getTotal().subtract(i.getAmountPaid()).max(BigDecimal.ZERO);
    }

    public static boolean overdue(Invoice i, LocalDate today) {
        return (i.getStatus() == InvoiceStatus.ISSUED || i.getStatus() == InvoiceStatus.PARTIALLY_PAID)
                && i.getDueOn() != null
                && i.getDueOn().isBefore(today);
    }

    /** An estimated quotation line priced per unit, not overridden: its quantity can be set from what happened. */
    public static boolean actualisable(QuotationLine l) {
        return l != null
                && l.getCertainty() == LineCertainty.ESTIMATED
                && l.getUnitRate() != null
                && l.getOverrideAmount() == null;
    }

    public static InvoiceSummaryResponse toSummary(Invoice i, LocalDate today) {
        return InvoiceSummaryResponse.builder()
                .id(i.getId())
                .code(i.getCode())
                .kind(i.getKind())
                .status(i.getStatus())
                .clubName(i.getClub() == null ? null : i.getClub().getName())
                .requestId(i.getQuotation().getRequest().getId())
                .requestCode(i.getQuotation().getRequest().getCode())
                .jobCode(i.getJob() == null ? null : i.getJob().getCode())
                .currency(i.getQuotation().getCurrency())
                .total(i.getTotal())
                .amountDue(amountDue(i))
                .dueOn(i.getDueOn())
                .overdue(overdue(i, today))
                .build();
    }

    public static InvoiceResponse toResponse(Invoice i, List<Payment> payments, LocalDate today) {
        return InvoiceResponse.builder()
                .id(i.getId())
                .code(i.getCode())
                .kind(i.getKind())
                .status(i.getStatus())
                .clubName(i.getClub().getName())
                .requestId(i.getQuotation().getRequest().getId())
                .requestCode(i.getQuotation().getRequest().getCode())
                .jobId(i.getJob() == null ? null : i.getJob().getId())
                .jobCode(i.getJob() == null ? null : i.getJob().getCode())
                .quotationCode(i.getQuotation().getCode())
                .quotationVersion(i.getQuotation().getVersionNo())
                .quotationTotal(i.getQuotation().getTotal())
                .currency(i.getQuotation().getCurrency())
                .issuedAt(i.getIssuedAt())
                .issuedByName(i.getIssuedBy() == null ? null : i.getIssuedBy().displayName())
                .dueOn(i.getDueOn())
                .overdue(overdue(i, today))
                .subtotal(i.getSubtotal())
                .taxPct(i.getTaxPct())
                .taxAmount(i.getTaxAmount())
                .total(i.getTotal())
                .amountPaid(i.getAmountPaid())
                .amountDue(amountDue(i))
                .lines(i.getLines().stream().map(InvoiceMapper::toLine).toList())
                .payments(payments.stream().map(InvoiceMapper::toPayment).toList())
                .build();
    }

    private static InvoiceLineResponse toLine(InvoiceLine l) {
        QuotationLine q = l.getQuotationLine();
        return InvoiceLineResponse.builder()
                .id(l.getId())
                .position(l.getPosition())
                .kind(l.getKind())
                .description(l.getDescription())
                .quantity(l.getQuantity())
                .unitRate(l.getUnitRate())
                .amount(l.getAmount())
                .note(l.getNote())
                .quotationLineId(q == null ? null : q.getId())
                .quotedQuantity(q == null ? null : q.getQuantity())
                .quotedAmount(
                        q == null ? null : q.getOverrideAmount() != null ? q.getOverrideAmount() : q.getCatalogAmount())
                .actualisable(l.getInvoice().getStatus() == InvoiceStatus.DRAFT && actualisable(q))
                .build();
    }

    private static PaymentResponse toPayment(Payment p) {
        return PaymentResponse.builder()
                .id(p.getId())
                .amount(p.getAmount())
                .method(p.getMethod())
                .reference(p.getReference())
                .receivedAt(p.getReceivedAt())
                .recordedByName(
                        p.getRecordedBy() == null ? null : p.getRecordedBy().displayName())
                .status(p.getStatus())
                .build();
    }
}
