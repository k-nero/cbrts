package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Club;
import com.equifreight.entity.Invoice;
import com.equifreight.entity.Payment;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceStatus;
import com.equifreight.entity.enums.PaymentMethod;
import com.equifreight.entity.enums.PaymentStatus;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.repository.PaymentRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ReceiptServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T03:00:00Z");

    private final PaymentRepository payments = mock(PaymentRepository.class);
    private final ClubService clubs = mock(ClubService.class);
    private ReceiptService service;
    private User customer;
    private Club club;
    private Invoice invoice;
    private Payment transfer;
    private Payment card;

    private Payment payment(String amount, PaymentMethod method, String reference, Instant at, User by) {
        Payment p = new Payment();
        p.setId(UUID.randomUUID());
        p.setInvoice(invoice);
        p.setAmount(new BigDecimal(amount));
        p.setMethod(method);
        p.setReference(reference);
        p.setReceivedAt(at);
        p.setRecordedBy(by);
        p.setStatus(PaymentStatus.CONFIRMED);
        return p;
    }

    @BeforeEach
    void setUp() {
        service = new ReceiptService(payments, clubs, Clock.fixed(NOW, BusinessTime.ZONE));
        club = new Club();
        club.setId(UUID.randomUUID());
        club.setName("Câu lạc bộ Đua ngựa Phú Thọ");
        customer = new User();
        customer.setId(UUID.randomUUID());
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0041");
        Quotation quotation = new Quotation();
        quotation.setRequest(request);
        quotation.setCurrency("USD");
        invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setCode("INV-2026-0041");
        invoice.setKind(InvoiceKind.DEPOSIT);
        invoice.setQuotation(quotation);
        invoice.setClub(club);
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setTotal(new BigDecimal("1002.00"));
        invoice.setAmountPaid(new BigDecimal("1002.00"));
        User yen = new User();
        yen.setFirstName("Hải Yến");
        yen.setLastName("Vũ");
        transfer =
                payment("500.00", PaymentMethod.BANK_TRANSFER, "VCB 8841", Instant.parse("2026-10-22T03:00:00Z"), yen);
        card = payment("502.00", PaymentMethod.CARD, "pi_3Q", Instant.parse("2026-10-23T03:00:00Z"), null);
        when(clubs.requireClub(customer)).thenReturn(club);
        when(payments.findDetailedById(transfer.getId())).thenReturn(Optional.of(transfer));
        when(payments.findDetailedById(card.getId())).thenReturn(Optional.of(card));
        when(payments.findByInvoice_IdOrderByReceivedAtAsc(invoice.getId())).thenReturn(List.of(transfer, card));
    }

    private static String text(byte[] pdf) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(doc);
        }
    }

    @Test
    @DisplayName("A receipt shows the amount, the invoice, and the balance this payment left, without accents")
    void receiptOfAnEarlierPayment() throws Exception {
        ReceiptService.ReceiptFile file = service.ofCustomer(customer, transfer.getId());

        assertEquals("receipt-INV-2026-0041-2026-10-22.pdf", file.filename());
        String text = text(file.content());
        assertTrue(text.contains("Payment receipt"), text);
        assertTrue(text.contains("USD 500.00"), text);
        assertTrue(text.contains("Cau lac bo Dua ngua Phu Tho"), text);
        assertTrue(text.contains("Deposit invoice INV-2026-0041"), text);
        assertTrue(text.contains("Bank transfer"), text);
        assertTrue(text.contains("Vu Hai Yen, EquiFreight"), text);
        // Printed after the card payment came in, it still shows what was left after this one.
        assertTrue(text.contains("USD 502.00"), text);
        assertTrue(text.contains("Issued 24 Oct 2026"), text);
        assertTrue(text.contains("PART PAYMENT"), text);
    }

    @Test
    @DisplayName("A card payment made online says so, and a receipt of the last payment reads paid in full")
    void receiptOfACardPayment() throws Exception {
        String text = text(service.ofCustomer(customer, card.getId()).content());
        assertTrue(text.contains("Card, paid online"), text);
        assertTrue(text.contains("Confirmed by the card payment provider"), text);
        assertTrue(text.contains("pi_3Q"), text);
        assertTrue(text.contains("Nothing, paid in full"), text);
        assertTrue(text.contains("PAID IN FULL"), text);
    }

    @Test
    @DisplayName("Another club's payment, or one that isn't confirmed, has no receipt")
    void noReceipt() {
        Club other = new Club();
        other.setId(UUID.randomUUID());
        invoice.setClub(other);
        assertThrows(ResourceNotFoundException.class, () -> service.ofCustomer(customer, card.getId()));

        invoice.setClub(club);
        card.setStatus(PaymentStatus.PENDING);
        assertThrows(ResourceNotFoundException.class, () -> service.ofCustomer(customer, card.getId()));
        assertThrows(ResourceNotFoundException.class, () -> service.ofStaff(card.getId()));
    }
}
