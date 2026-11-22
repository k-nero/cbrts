package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Invoice;
import com.equifreight.entity.Payment;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.PaymentMethod;
import com.equifreight.entity.enums.PaymentStatus;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.repository.PaymentRepository;
import com.equifreight.service.receipt.ReceiptPdf;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A PDF receipt for a confirmed payment against an invoice, paid by card online or recorded by hand. Drawn when asked
 * for from the payment as recorded, which is never edited, so the same payment always gives the same receipt (only the
 * "issued" date differs). A payment that isn't confirmed has no receipt.
 */
@Service
public class ReceiptService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private final PaymentRepository payments;
    private final ClubService clubs;
    private final ReceiptPdf pdf = new ReceiptPdf();
    private final Clock clock;

    public ReceiptService(PaymentRepository payments, ClubService clubs, Clock clock) {
        this.payments = payments;
        this.clubs = clubs;
        this.clock = clock;
    }

    /** A file to download: its name and the PDF. */
    public record ReceiptFile(String filename, byte[] content) {}

    /** The receipt of one of the club's payments; anyone else's is not found. */
    @Transactional(readOnly = true)
    public ReceiptFile ofCustomer(User customer, UUID paymentId) {
        Club club = clubs.requireClub(customer);
        Payment payment = confirmed(paymentId);
        if (!payment.getInvoice().getClub().getId().equals(club.getId())) {
            throw ResourceNotFoundException.of("Payment", paymentId);
        }
        return render(payment);
    }

    /** The receipt of any confirmed payment (the logistics manager's Invoices). */
    @Transactional(readOnly = true)
    public ReceiptFile ofStaff(UUID paymentId) {
        return render(confirmed(paymentId));
    }

    private Payment confirmed(UUID paymentId) {
        return payments.findDetailedById(paymentId)
                .filter(p -> p.getStatus() == PaymentStatus.CONFIRMED)
                .orElseThrow(() -> ResourceNotFoundException.of("Payment", paymentId));
    }

    private ReceiptFile render(Payment payment) {
        Invoice invoice = payment.getInvoice();
        String currency = invoice.getQuotation().getCurrency();
        LocalDate paidOn = LocalDate.ofInstant(payment.getReceivedAt(), BusinessTime.ZONE);

        // What was paid up to and including this payment, so a receipt printed later still shows the balance it left.
        List<Payment> all = payments.findByInvoice_IdOrderByReceivedAtAsc(invoice.getId());
        BigDecimal paidToDate = BigDecimal.ZERO;
        for (Payment p : all) {
            if (p.getStatus() != PaymentStatus.CONFIRMED) continue;
            paidToDate = paidToDate.add(p.getAmount());
            if (p.getId().equals(payment.getId())) break;
        }
        BigDecimal left = invoice.getTotal().subtract(paidToDate).max(BigDecimal.ZERO);

        List<ReceiptPdf.Row> rows = new ArrayList<>();
        rows.add(new ReceiptPdf.Row("Received from", invoice.getClub().getName()));
        rows.add(new ReceiptPdf.Row(
                "For",
                (invoice.getKind() == InvoiceKind.DEPOSIT ? "Deposit invoice " : "Final invoice ")
                        + invoice.getCode()));
        String move = java.util.stream.Stream.of(
                        invoice.getQuotation().getRequest().getCode(),
                        invoice.getJob() == null ? null : invoice.getJob().getCode())
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.joining(" · "));
        if (!move.isEmpty()) rows.add(new ReceiptPdf.Row("Move", move, true));
        rows.add(new ReceiptPdf.Row(
                "Recorded by",
                payment.getRecordedBy() == null
                        ? "Confirmed by the card payment provider"
                        : payment.getRecordedBy().displayName() + ", EquiFreight"));
        if (payment.getReference() != null) rows.add(new ReceiptPdf.Row("Reference", payment.getReference(), true));
        rows.add(new ReceiptPdf.Row("Receipt id", payment.getId().toString(), true));
        List<ReceiptPdf.Row> highlights = List.of(
                new ReceiptPdf.Row("Paid on", DAY.format(paidOn)), new ReceiptPdf.Row("Method", method(payment)));

        List<ReceiptPdf.Row> balance = List.of(
                new ReceiptPdf.Row("Invoice total", InvoiceService.money(currency, invoice.getTotal()), true),
                new ReceiptPdf.Row("Paid to date", InvoiceService.money(currency, paidToDate), true),
                left.signum() == 0
                        ? new ReceiptPdf.Row("Left to pay", "Nothing, paid in full")
                        : new ReceiptPdf.Row("Left to pay", InvoiceService.money(currency, left), true));

        boolean settled = left.signum() == 0;
        byte[] content = pdf.render(new ReceiptPdf.Receipt(
                "Payment receipt",
                "Issued " + DAY.format(LocalDate.now(clock.withZone(BusinessTime.ZONE))),
                settled ? "Paid in full" : "Part payment",
                settled,
                "Amount received",
                InvoiceService.money(currency, payment.getAmount()),
                highlights,
                rows,
                balance,
                "This receipt confirms money received against the invoice above; it is not a tax invoice. "
                        + "Prototype: EquiFreight's company details are placeholders."));
        return new ReceiptFile("receipt-" + invoice.getCode() + "-" + paidOn + ".pdf", content);
    }

    private static String method(Payment payment) {
        if (payment.getMethod() == PaymentMethod.CARD) {
            return payment.getRecordedBy() == null ? "Card, paid online" : "Card";
        }
        return "Bank transfer";
    }
}
