package com.equifreight.service;

import com.equifreight.configuration.PaymentProperties;
import com.equifreight.entity.CardCheckout;
import com.equifreight.entity.Club;
import com.equifreight.entity.Invoice;
import com.equifreight.entity.Payment;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CardCheckoutStatus;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.invoice.CardCheckoutResponse;
import com.equifreight.model.invoice.InvoiceMapper;
import com.equifreight.repository.CardCheckoutRepository;
import com.equifreight.repository.InvoiceRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import com.equifreight.service.payment.CardGateway;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Paying an invoice by card online (database-design.md, 13A). The customer opens a hosted Stripe Checkout page for the
 * amount due; Stripe's signed webhook then says it was paid or ran out. Only the webhook records a payment, through
 * {@link InvoiceService#recordCardPayment}, so a customer coming back to the success page proves nothing.
 *
 * <p>A payment that arrives after its invoice stopped being owed (paid by bank transfer meanwhile, voided, or the
 * amount changed) is refunded in full rather than recorded, so an invoice is never paid more than its total.
 */
@Log4j2
@Service
public class CardPaymentService {

    static final String ENTITY_TYPE = "INVOICE";
    /** How long a checkout page stays open: Stripe's shortest. */
    static final Duration CHECKOUT_LIFETIME = Duration.ofMinutes(30);
    /** An open page is reused only if the customer still has this long to finish on it. */
    static final Duration REUSE_MARGIN = Duration.ofMinutes(10);

    private static final EnumSet<InvoiceStatus> UNPAID = EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID);

    private final CardCheckoutRepository checkouts;
    private final InvoiceRepository invoices;
    private final InvoiceService invoiceService;
    private final ClubService clubs;
    private final CardGateway gateway;
    private final PaymentProperties properties;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public CardPaymentService(
            CardCheckoutRepository checkouts,
            InvoiceRepository invoices,
            InvoiceService invoiceService,
            ClubService clubs,
            CardGateway gateway,
            PaymentProperties properties,
            AuditService audit,
            NotificationService notifications,
            Clock clock) {
        this.checkouts = checkouts;
        this.invoices = invoices;
        this.invoiceService = invoiceService;
        this.clubs = clubs;
        this.gateway = gateway;
        this.properties = properties;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    // ---------- the customer opens the page ----------

    /**
     * A hosted card payment page for what is due on one of the club's issued invoices. An open page for the same amount
     * is reused; one for another amount (a payment came in meanwhile) is closed and replaced, so only one can be paid.
     */
    @Transactional
    public CardCheckoutResponse start(User customer, UUID invoiceId) {
        Club club = clubs.requireClub(customer);
        Invoice invoice = invoices.findLockedById(invoiceId)
                .filter(i -> i.getClub().getId().equals(club.getId()) && i.getStatus() != InvoiceStatus.DRAFT)
                .orElseThrow(() -> ResourceNotFoundException.of("Invoice", invoiceId));
        BigDecimal due = InvoiceMapper.amountDue(invoice);
        if (!UNPAID.contains(invoice.getStatus()) || due.signum() <= 0) {
            throw new BusinessException("Nothing is owed on invoice " + invoice.getCode() + ": it is "
                    + invoice.getStatus().name().toLowerCase(Locale.ROOT).replace('_', ' '));
        }
        if (!gateway.enabled()) {
            throw new BusinessException("Card payment isn't set up yet. Pay " + invoice.getCode()
                    + " by bank transfer, with the invoice code as the reference");
        }
        Instant now = clock.instant();
        Optional<CardCheckout> open =
                checkouts.findFirstByInvoice_IdAndStatus(invoice.getId(), CardCheckoutStatus.OPEN);
        if (open.isPresent()) {
            CardCheckout current = open.get();
            if (current.getAmount().compareTo(due) == 0
                    && current.getExpiresAt().isAfter(now.plus(REUSE_MARGIN))) {
                return InvoiceMapper.toCheckoutResponse(current);
            }
            if (!gateway.expire(current.getSessionId())) {
                throw new ConflictException(
                        "CARD_PAYMENT_CONFIRMING",
                        "A card payment on " + invoice.getCode() + " has just been made and is being confirmed. "
                                + "Refresh this page in a minute.");
            }
            current.setStatus(CardCheckoutStatus.EXPIRED);
            // Flushed before the new one is inserted: at most one open checkout per invoice.
            checkouts.saveAndFlush(current);
        }

        Instant expiresAt = now.plus(CHECKOUT_LIFETIME);
        String page = properties.returnUrl().replaceAll("/+$", "") + "/requests/"
                + invoice.getQuotation().getRequest().getId() + "/invoices/" + invoice.getId();
        String currency = invoice.getQuotation().getCurrency();
        CardGateway.Session session = gateway.open(
                new CardGateway.Checkout(
                        invoice.getId(),
                        invoice.getCode(),
                        (invoice.getKind() == InvoiceKind.DEPOSIT ? "Deposit invoice " : "Final invoice ")
                                + invoice.getCode(),
                        currency,
                        due,
                        customer.getEmail(),
                        page + "?card=paid",
                        page + "?card=cancelled",
                        expiresAt),
                // One page per invoice, amount and moment: a retried call gets the same page back from Stripe.
                "checkout-" + invoice.getId() + "-" + due.toPlainString() + "-" + now.getEpochSecond());

        CardCheckout checkout = new CardCheckout();
        checkout.setInvoice(invoice);
        checkout.setSessionId(session.id());
        checkout.setUrl(session.url());
        checkout.setAmount(due);
        checkout.setStatus(CardCheckoutStatus.OPEN);
        checkout.setExpiresAt(expiresAt);
        checkout.setStartedBy(customer);
        checkouts.save(checkout);
        log.info("Card checkout {} opened for {} {} on {}", session.id(), currency, due, invoice.getCode());
        return InvoiceMapper.toCheckoutResponse(checkout);
    }

    // ---------- Stripe's webhook ----------

    /**
     * A webhook call from Stripe, after its signature is checked. A paid checkout records the payment, or refunds it
     * when the invoice is no longer owed; an expired one is closed. Events Stripe retries are handled once, and events
     * about checkouts this server didn't open (another environment on the same Stripe account) are ignored.
     */
    @Transactional
    public void handle(String payload, String signature) {
        Optional<CardGateway.Event> parsed = gateway.parse(payload, signature);
        if (parsed.isEmpty()) return;
        CardGateway.Event event = parsed.get();
        Optional<CardCheckout> found = checkouts.findLockedBySessionId(event.sessionId());
        if (found.isEmpty()) {
            log.info("Stripe event about checkout {}, which this server didn't open: ignored", event.sessionId());
            return;
        }
        CardCheckout checkout = found.get();
        switch (event.kind()) {
            case EXPIRED -> {
                if (checkout.getStatus() == CardCheckoutStatus.OPEN) {
                    checkout.setStatus(CardCheckoutStatus.EXPIRED);
                    checkouts.save(checkout);
                }
            }
            case PAID -> paid(checkout, event);
        }
    }

    private void paid(CardCheckout checkout, CardGateway.Event event) {
        if (checkout.getStatus() == CardCheckoutStatus.PAID || checkout.getStatus() == CardCheckoutStatus.REFUNDED) {
            return;
        }
        if (event.paymentIntent() == null) {
            throw new IllegalStateException(
                    "Stripe says checkout " + checkout.getSessionId() + " is paid but names no payment intent");
        }
        Invoice invoice = invoices.findLockedById(checkout.getInvoice().getId()).orElseThrow();
        checkout.setPaymentIntent(event.paymentIntent());
        String refusal = InvoiceService.cardRefusal(invoice, event.amount(), event.currency());
        if (refusal == null) {
            Payment payment = invoiceService.recordCardPayment(
                    invoice.getId(), event.amount(), event.paymentIntent(), clock.instant());
            checkout.setPayment(payment);
            checkout.setStatus(CardCheckoutStatus.PAID);
            checkouts.save(checkout);
            log.info("Card payment {} recorded on {}", event.paymentIntent(), invoice.getCode());
            return;
        }

        // The same key on a retried event: Stripe refunds once.
        String refundId = gateway.refund(event.paymentIntent(), "refund-" + checkout.getSessionId());
        checkout.setRefundId(refundId);
        checkout.setStatus(CardCheckoutStatus.REFUNDED);
        checkouts.save(checkout);
        String charged = InvoiceService.money(event.currency(), event.amount());
        audit.recordDecision(
                null,
                "REFUND_CARD_PAYMENT",
                AuditText.fit(charged + " paid by card on " + invoice.getCode() + " refunded, ref "
                        + event.paymentIntent() + ": " + refusal),
                ENTITY_TYPE,
                invoice.getId(),
                invoice.getCode(),
                refusal,
                null,
                null);
        BigDecimal due = InvoiceMapper.amountDue(invoice);
        notifications.notify(
                NotificationKind.CARD_PAYMENT_REFUNDED,
                Audience.club(invoice.getClub().getId()),
                Subject.invoice(invoice),
                "Card payment refunded for " + invoice.getCode(),
                charged + " was refunded to your card because " + refusal + ". "
                        + (UNPAID.contains(invoice.getStatus()) && due.signum() > 0
                                ? InvoiceService.money(invoice.getQuotation().getCurrency(), due)
                                        + " is still due; open the invoice to pay it."
                                : "Nothing more is owed on this invoice."));
        log.warn("Card payment {} on {} refunded: {}", event.paymentIntent(), invoice.getCode(), refusal);
    }
}
