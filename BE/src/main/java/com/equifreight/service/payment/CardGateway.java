package com.equifreight.service.payment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Takes card payments for invoices on a hosted payment page (database-design.md, 13A). {@link StripeCardGateway} is the
 * real one; {@link DisabledCardGateway} stands in when no Stripe key is configured, so customers pay by bank transfer.
 *
 * <p>Every call to the gateway throws {@link com.equifreight.exception.PaymentGatewayException} when it fails or can't
 * be reached.
 */
public interface CardGateway {

    /** Whether card payment is set up on this server. */
    boolean enabled();

    /** Opens a hosted payment page for one amount. Retrying with the same {@code idempotencyKey} opens it once. */
    Session open(Checkout checkout, String idempotencyKey);

    /**
     * Closes an open page so it can no longer be paid. Returns {@code false} when it can't be closed because the
     * customer has already paid on it (the webhook will bring the payment); closing a page that already ran out is fine.
     */
    boolean expire(String sessionId);

    /** Sends a payment back in full. Retrying with the same {@code idempotencyKey} refunds it once. Returns the refund id. */
    String refund(String paymentIntent, String idempotencyKey);

    /**
     * Reads a webhook call, after checking its signature against the endpoint's secret. Empty for an event that isn't
     * about a checkout being paid or running out.
     *
     * @throws com.equifreight.exception.UnauthorizedException when the signature doesn't match
     */
    Optional<Event> parse(String payload, String signature);

    /**
     * What the customer pays: one line, the amount due on the invoice.
     *
     * @param invoiceId   carried as the client reference and in the metadata, to trace a payment in the dashboard
     * @param description the line the customer sees: "Final invoice INV-2026-0041"
     * @param currency    ISO 4217, upper case
     */
    record Checkout(
            UUID invoiceId,
            String invoiceCode,
            String description,
            String currency,
            BigDecimal amount,
            String customerEmail,
            String successUrl,
            String cancelUrl,
            Instant expiresAt) {}

    /** A hosted payment page: its id and where to send the customer. */
    record Session(String id, String url) {}

    /**
     * A webhook event about a checkout.
     *
     * @param amount   what was charged, in {@code currency}; null for {@link Kind#EXPIRED}
     * @param currency ISO 4217, upper case
     */
    record Event(Kind kind, String sessionId, String paymentIntent, BigDecimal amount, String currency) {
        public enum Kind {
            /** The customer paid; the money is captured. */
            PAID,
            /** The page ran out, or was closed, without a payment. */
            EXPIRED
        }
    }
}
