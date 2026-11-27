package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.configuration.PaymentProperties;
import com.equifreight.entity.CardCheckout;
import com.equifreight.entity.Club;
import com.equifreight.entity.Invoice;
import com.equifreight.entity.Payment;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CardCheckoutStatus;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.invoice.CardCheckoutResponse;
import com.equifreight.repository.CardCheckoutRepository;
import com.equifreight.repository.InvoiceRepository;
import com.equifreight.service.payment.CardGateway;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class CardPaymentServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T03:00:00Z");

    private final CardCheckoutRepository checkouts = mock(CardCheckoutRepository.class);
    private final InvoiceRepository invoices = mock(InvoiceRepository.class);
    private final InvoiceService invoiceService = mock(InvoiceService.class);
    private final ClubService clubs = mock(ClubService.class);
    private final CardGateway gateway = mock(CardGateway.class);
    private final AuditService audit = mock(AuditService.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private CardPaymentService service;
    private User customer;
    private Club club;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        service = new CardPaymentService(
                checkouts,
                invoices,
                invoiceService,
                clubs,
                gateway,
                new PaymentProperties("http://localhost:5173/", new PaymentProperties.Stripe("sk_test_x", "whsec_x")),
                audit,
                notifications,
                Clock.fixed(NOW, BusinessTime.ZONE));
        club = new Club();
        club.setId(UUID.randomUUID());
        club.setName("Saigon Turf Club");
        customer = new User();
        customer.setId(UUID.randomUUID());
        customer.setEmail("owner@example.test");
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        request.setCode("REQ-2026-0041");
        request.setClub(club);
        Quotation quotation = new Quotation();
        quotation.setId(UUID.randomUUID());
        quotation.setRequest(request);
        quotation.setCurrency("USD");
        invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setCode("INV-2026-0041");
        invoice.setKind(InvoiceKind.DEPOSIT);
        invoice.setQuotation(quotation);
        invoice.setClub(club);
        invoice.setStatus(InvoiceStatus.ISSUED);
        invoice.setTotal(new BigDecimal("1002.00"));
        invoice.setAmountPaid(BigDecimal.ZERO);

        when(clubs.requireClub(customer)).thenReturn(club);
        when(invoices.findLockedById(invoice.getId())).thenReturn(Optional.of(invoice));
        when(gateway.enabled()).thenReturn(true);
        when(gateway.open(any(), anyString())).thenReturn(new CardGateway.Session("cs_new", "https://pay.test/cs_new"));
        when(checkouts.findFirstByInvoice_IdAndStatus(invoice.getId(), CardCheckoutStatus.OPEN))
                .thenReturn(Optional.empty());
    }

    private CardCheckout openCheckout(String sessionId, String amount, Instant expiresAt) {
        CardCheckout c = new CardCheckout();
        c.setId(UUID.randomUUID());
        c.setInvoice(invoice);
        c.setSessionId(sessionId);
        c.setUrl("https://pay.test/" + sessionId);
        c.setAmount(new BigDecimal(amount));
        c.setStatus(CardCheckoutStatus.OPEN);
        c.setExpiresAt(expiresAt);
        c.setStartedBy(customer);
        return c;
    }

    private static CardGateway.Event paid(String sessionId, String amount) {
        return new CardGateway.Event(
                CardGateway.Event.Kind.PAID, sessionId, "pi_" + sessionId, new BigDecimal(amount), "USD");
    }

    // ---------- opening the page ----------

    @Test
    @DisplayName("The page is opened for what is due, and sends the customer back to the invoice")
    void opensForTheAmountDue() {
        invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        invoice.setAmountPaid(new BigDecimal("500.00"));

        CardCheckoutResponse response = service.start(customer, invoice.getId());

        assertEquals("https://pay.test/cs_new", response.url());
        assertEquals(NOW.plus(Duration.ofMinutes(30)), response.expiresAt());
        ArgumentCaptor<CardGateway.Checkout> sent = ArgumentCaptor.forClass(CardGateway.Checkout.class);
        verify(gateway).open(sent.capture(), anyString());
        String page = "http://localhost:5173/requests/"
                + invoice.getQuotation().getRequest().getId() + "/invoices/" + invoice.getId();
        assertEquals(new BigDecimal("502.00"), sent.getValue().amount());
        assertEquals("USD", sent.getValue().currency());
        assertEquals("Deposit invoice INV-2026-0041", sent.getValue().description());
        assertEquals("owner@example.test", sent.getValue().customerEmail());
        assertEquals(page + "?card=paid", sent.getValue().successUrl());
        assertEquals(page + "?card=cancelled", sent.getValue().cancelUrl());
        ArgumentCaptor<CardCheckout> saved = ArgumentCaptor.forClass(CardCheckout.class);
        verify(checkouts).save(saved.capture());
        assertEquals("cs_new", saved.getValue().getSessionId());
        assertEquals(CardCheckoutStatus.OPEN, saved.getValue().getStatus());
        assertEquals(new BigDecimal("502.00"), saved.getValue().getAmount());
    }

    @Test
    @DisplayName("Another club's invoice, or a draft, is not found")
    void anotherClubsInvoiceIsNotFound() {
        Club other = new Club();
        other.setId(UUID.randomUUID());
        invoice.setClub(other);
        assertThrows(ResourceNotFoundException.class, () -> service.start(customer, invoice.getId()));

        invoice.setClub(club);
        invoice.setStatus(InvoiceStatus.DRAFT);
        assertThrows(ResourceNotFoundException.class, () -> service.start(customer, invoice.getId()));
        verify(gateway, never()).open(any(), anyString());
    }

    @Test
    @DisplayName("A paid or void invoice can't be paid by card")
    void nothingOwed() {
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setAmountPaid(new BigDecimal("1002.00"));
        BusinessException paid = assertThrows(BusinessException.class, () -> service.start(customer, invoice.getId()));
        assertEquals("Nothing is owed on invoice INV-2026-0041: it is paid", paid.getMessage());

        invoice.setStatus(InvoiceStatus.VOID);
        assertThrows(BusinessException.class, () -> service.start(customer, invoice.getId()));
        verify(gateway, never()).open(any(), anyString());
    }

    @Test
    @DisplayName("Without a Stripe key the customer is told to pay by bank transfer")
    void offWithoutAKey() {
        when(gateway.enabled()).thenReturn(false);
        BusinessException off = assertThrows(BusinessException.class, () -> service.start(customer, invoice.getId()));
        assertEquals(
                "Card payment isn't set up yet. Pay INV-2026-0041 by bank transfer, with the invoice code as the "
                        + "reference",
                off.getMessage());
    }

    @Test
    @DisplayName("An open page for the same amount, with time left, is reused")
    void reusesTheOpenPage() {
        CardCheckout open = openCheckout("cs_old", "1002.00", NOW.plus(Duration.ofMinutes(25)));
        when(checkouts.findFirstByInvoice_IdAndStatus(invoice.getId(), CardCheckoutStatus.OPEN))
                .thenReturn(Optional.of(open));

        assertEquals(
                "https://pay.test/cs_old",
                service.start(customer, invoice.getId()).url());
        verify(gateway, never()).open(any(), anyString());
        verify(gateway, never()).expire(anyString());
    }

    @Test
    @DisplayName("An open page for an older amount is closed before a new one opens, so only one can be paid")
    void replacesAStalePage() {
        CardCheckout open = openCheckout("cs_old", "1002.00", NOW.plus(Duration.ofMinutes(25)));
        when(checkouts.findFirstByInvoice_IdAndStatus(invoice.getId(), CardCheckoutStatus.OPEN))
                .thenReturn(Optional.of(open));
        when(gateway.expire("cs_old")).thenReturn(true);
        invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        invoice.setAmountPaid(new BigDecimal("500.00"));

        assertEquals(
                "https://pay.test/cs_new",
                service.start(customer, invoice.getId()).url());
        assertEquals(CardCheckoutStatus.EXPIRED, open.getStatus());
        verify(checkouts).saveAndFlush(open);
    }

    @Test
    @DisplayName("A page about to run out is replaced too")
    void replacesAPageAboutToRunOut() {
        CardCheckout open = openCheckout("cs_old", "1002.00", NOW.plus(Duration.ofMinutes(5)));
        when(checkouts.findFirstByInvoice_IdAndStatus(invoice.getId(), CardCheckoutStatus.OPEN))
                .thenReturn(Optional.of(open));
        when(gateway.expire("cs_old")).thenReturn(true);

        assertEquals(
                "https://pay.test/cs_new",
                service.start(customer, invoice.getId()).url());
        assertEquals(CardCheckoutStatus.EXPIRED, open.getStatus());
    }

    @Test
    @DisplayName("When the open page was just paid, no second one opens")
    void justPaid() {
        CardCheckout open = openCheckout("cs_old", "900.00", NOW.plus(Duration.ofMinutes(25)));
        when(checkouts.findFirstByInvoice_IdAndStatus(invoice.getId(), CardCheckoutStatus.OPEN))
                .thenReturn(Optional.of(open));
        when(gateway.expire("cs_old")).thenReturn(false);

        ConflictException confirming =
                assertThrows(ConflictException.class, () -> service.start(customer, invoice.getId()));
        assertEquals("CARD_PAYMENT_CONFIRMING", confirming.getCode());
        assertEquals(CardCheckoutStatus.OPEN, open.getStatus());
        verify(gateway, never()).open(any(), anyString());
    }

    // ---------- the webhook ----------

    @Test
    @DisplayName("A paid checkout records the payment once, however often Stripe sends the event")
    void paidIsRecordedOnce() {
        CardCheckout open = openCheckout("cs_1", "1002.00", NOW.plus(Duration.ofMinutes(25)));
        when(checkouts.findLockedBySessionId("cs_1")).thenReturn(Optional.of(open));
        when(gateway.parse("{}", "sig")).thenReturn(Optional.of(paid("cs_1", "1002.00")));
        Payment payment = new Payment();
        when(invoiceService.recordCardPayment(invoice.getId(), new BigDecimal("1002.00"), "pi_cs_1", NOW))
                .thenReturn(payment);

        service.handle("{}", "sig");
        service.handle("{}", "sig");

        verify(invoiceService, times(1)).recordCardPayment(any(), any(), any(), any());
        assertEquals(CardCheckoutStatus.PAID, open.getStatus());
        assertSame(payment, open.getPayment());
        assertEquals("pi_cs_1", open.getPaymentIntent());
        verify(gateway, never()).refund(anyString(), anyString());
    }

    @Test
    @DisplayName("A payment that arrives after the invoice was paid another way is refunded, and the club is told")
    void paidTooLateIsRefunded() {
        CardCheckout open = openCheckout("cs_1", "1002.00", NOW.plus(Duration.ofMinutes(25)));
        when(checkouts.findLockedBySessionId("cs_1")).thenReturn(Optional.of(open));
        when(gateway.parse("{}", "sig")).thenReturn(Optional.of(paid("cs_1", "1002.00")));
        when(gateway.refund("pi_cs_1", "refund-cs_1")).thenReturn("re_1");
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setAmountPaid(new BigDecimal("1002.00"));

        service.handle("{}", "sig");

        verify(invoiceService, never()).recordCardPayment(any(), any(), any(), any());
        assertEquals(CardCheckoutStatus.REFUNDED, open.getStatus());
        assertEquals("re_1", open.getRefundId());
        verify(audit)
                .recordDecision(
                        eq(null),
                        eq("REFUND_CARD_PAYMENT"),
                        eq("USD 1,002.00 paid by card on INV-2026-0041 refunded, ref pi_cs_1: the invoice was already "
                                + "paid in full"),
                        eq("INVOICE"),
                        eq(invoice.getId()),
                        eq("INV-2026-0041"),
                        any(),
                        any(),
                        any());
        verify(notifications)
                .notify(
                        eq(NotificationKind.CARD_PAYMENT_REFUNDED),
                        any(),
                        any(),
                        eq("Card payment refunded for INV-2026-0041"),
                        eq("USD 1,002.00 was refunded to your card because the invoice was already paid in full. "
                                + "Nothing more is owed on this invoice."));
    }

    @Test
    @DisplayName("A payment for more than is now due is refunded, and the club is told what is still due")
    void paidMoreThanDueIsRefunded() {
        CardCheckout open = openCheckout("cs_1", "1002.00", NOW.plus(Duration.ofMinutes(25)));
        when(checkouts.findLockedBySessionId("cs_1")).thenReturn(Optional.of(open));
        when(gateway.parse("{}", "sig")).thenReturn(Optional.of(paid("cs_1", "1002.00")));
        when(gateway.refund("pi_cs_1", "refund-cs_1")).thenReturn("re_1");
        invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        invoice.setAmountPaid(new BigDecimal("500.00"));

        service.handle("{}", "sig");

        assertEquals(CardCheckoutStatus.REFUNDED, open.getStatus());
        verify(notifications)
                .notify(
                        eq(NotificationKind.CARD_PAYMENT_REFUNDED),
                        any(),
                        any(),
                        anyString(),
                        eq("USD 1,002.00 was refunded to your card because it was more than the USD 502.00 now due, "
                                + "after another payment came in. USD 502.00 is still due; open the invoice to pay "
                                + "it."));
    }

    @Test
    @DisplayName("A page that ran out is closed")
    void expired() {
        CardCheckout open = openCheckout("cs_1", "1002.00", NOW.minus(Duration.ofMinutes(1)));
        when(checkouts.findLockedBySessionId("cs_1")).thenReturn(Optional.of(open));
        when(gateway.parse("{}", "sig"))
                .thenReturn(
                        Optional.of(new CardGateway.Event(CardGateway.Event.Kind.EXPIRED, "cs_1", null, null, "USD")));

        service.handle("{}", "sig");

        assertEquals(CardCheckoutStatus.EXPIRED, open.getStatus());
        verify(checkouts).save(open);
    }

    @Test
    @DisplayName("Events about checkouts this server didn't open are ignored, never refunded")
    void someoneElsesCheckout() {
        when(checkouts.findLockedBySessionId("cs_other")).thenReturn(Optional.empty());
        when(gateway.parse("{}", "sig")).thenReturn(Optional.of(paid("cs_other", "50.00")));

        service.handle("{}", "sig");

        verify(gateway, never()).refund(anyString(), anyString());
        verify(invoiceService, never()).recordCardPayment(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Events that aren't about a checkout do nothing")
    void otherEvents() {
        when(gateway.parse("{}", "sig")).thenReturn(Optional.empty());
        service.handle("{}", "sig");
        verify(checkouts, never()).findLockedBySessionId(anyString());
    }
}
