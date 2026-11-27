package com.equifreight.service.payment;

import com.equifreight.exception.BusinessException;
import com.equifreight.exception.PaymentGatewayException;
import com.equifreight.exception.UnauthorizedException;
import com.stripe.StripeClient;
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.StripeObject;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import lombok.extern.log4j.Log4j2;

/**
 * Card payment through Stripe Checkout: a hosted page per amount due, confirmed by Stripe's signed webhook. No card
 * number ever reaches this server.
 */
@Log4j2
public class StripeCardGateway implements CardGateway {

    /** Stripe takes these in whole units: no minor unit (stripe.com/docs/currencies#zero-decimal). */
    private static final Set<String> ZERO_DECIMAL = Set.of(
            "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF",
            "XPF");
    /** And these in thousandths. */
    private static final Set<String> THREE_DECIMAL = Set.of("BHD", "JOD", "KWD", "OMR", "TND");

    private static final String UNAVAILABLE = "Card payment is unavailable right now. Try again in a few minutes, or "
            + "pay by bank transfer with the invoice code as the reference.";

    private final StripeClient client;
    private final String webhookSecret;

    public StripeCardGateway(StripeClient client, String webhookSecret) {
        this.client = client;
        this.webhookSecret = webhookSecret;
    }

    @Override
    public boolean enabled() {
        return true;
    }

    @Override
    public Session open(Checkout checkout, String idempotencyKey) {
        SessionCreateParams.Builder params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                // Cards only: the payment is recorded as CARD, so wallets, bank debits and pay-later offers would be
                // recorded under the wrong method.
                .addAllowedPaymentMethodType(SessionCreateParams.AllowedPaymentMethodType.CARD)
                // The invoice is charged in its own currency: no local-currency offer that the webhook would then
                // report in another currency than the invoice's.
                .setAdaptivePricing(SessionCreateParams.AdaptivePricing.builder()
                        .setEnabled(false)
                        .build())
                .setClientReferenceId(checkout.invoiceId().toString())
                .setSuccessUrl(checkout.successUrl())
                .setCancelUrl(checkout.cancelUrl())
                .setExpiresAt(checkout.expiresAt().getEpochSecond())
                .putMetadata("invoice_id", checkout.invoiceId().toString())
                .putMetadata("invoice_code", checkout.invoiceCode())
                .setPaymentIntentData(SessionCreateParams.PaymentIntentData.builder()
                        .setDescription(checkout.description())
                        .putMetadata("invoice_id", checkout.invoiceId().toString())
                        .putMetadata("invoice_code", checkout.invoiceCode())
                        .build())
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(checkout.currency().toLowerCase(Locale.ROOT))
                                .setUnitAmount(toMinorUnits(checkout.amount(), checkout.currency()))
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(checkout.description())
                                        .build())
                                .build())
                        .build());
        if (checkout.customerEmail() != null && !checkout.customerEmail().isBlank()) {
            params.setCustomerEmail(checkout.customerEmail());
        }
        try {
            com.stripe.model.checkout.Session session = client.v1()
                    .checkout()
                    .sessions()
                    .create(
                            params.build(),
                            RequestOptions.builder()
                                    .setIdempotencyKey(idempotencyKey)
                                    .build());
            return new Session(session.getId(), session.getUrl());
        } catch (StripeException e) {
            throw new PaymentGatewayException(UNAVAILABLE, e);
        }
    }

    @Override
    public boolean expire(String sessionId) {
        try {
            com.stripe.model.checkout.Session session =
                    client.v1().checkout().sessions().retrieve(sessionId);
            if ("open".equals(session.getStatus())) {
                session = client.v1().checkout().sessions().expire(sessionId);
            }
            return !"complete".equals(session.getStatus());
        } catch (StripeException e) {
            throw new PaymentGatewayException(UNAVAILABLE, e);
        }
    }

    @Override
    public String refund(String paymentIntent, String idempotencyKey) {
        try {
            return client.v1()
                    .refunds()
                    .create(
                            RefundCreateParams.builder()
                                    .setPaymentIntent(paymentIntent)
                                    .build(),
                            RequestOptions.builder()
                                    .setIdempotencyKey(idempotencyKey)
                                    .build())
                    .getId();
        } catch (StripeException e) {
            throw new PaymentGatewayException(UNAVAILABLE, e);
        }
    }

    @Override
    public Optional<Event> parse(String payload, String signature) {
        com.stripe.model.Event event;
        try {
            event = Webhook.constructEvent(payload, signature, webhookSecret);
        } catch (SignatureVerificationException e) {
            throw new UnauthorizedException("The Stripe-Signature header doesn't match this server's webhook secret");
        }
        Event.Kind kind = switch (event.getType()) {
            case "checkout.session.completed", "checkout.session.async_payment_succeeded" -> Event.Kind.PAID;
            case "checkout.session.expired" -> Event.Kind.EXPIRED;
            default -> null;
        };
        if (kind == null) return Optional.empty();
        // Not CardGateway.Session, which the interface's nested record would otherwise shadow.
        var session = (com.stripe.model.checkout.Session) objectOf(event);
        // A completed checkout paid by a delayed method (a bank debit) is unpaid until async_payment_succeeded.
        if (kind == Event.Kind.PAID && !"paid".equals(session.getPaymentStatus())) return Optional.empty();
        // A session the customer paid in a converted currency still reports the invoice's own amount as its source.
        var converted = session.getCurrencyConversion();
        String rawCurrency = converted != null && converted.getSourceCurrency() != null
                ? converted.getSourceCurrency()
                : session.getCurrency();
        Long rawAmount = converted != null && converted.getAmountTotal() != null
                ? converted.getAmountTotal()
                : session.getAmountTotal();
        String currency = rawCurrency == null ? null : rawCurrency.toUpperCase(Locale.ROOT);
        BigDecimal amount = kind == Event.Kind.PAID && rawAmount != null ? fromMinorUnits(rawAmount, currency) : null;
        return Optional.of(new Event(kind, session.getId(), session.getPaymentIntent(), amount, currency));
    }

    /**
     * The event's object. When the account's API version is newer than this library's, the typed view is empty and the
     * raw object is read as best it can be; the fields used here have been stable across versions.
     */
    private static StripeObject objectOf(com.stripe.model.Event event) {
        var data = event.getDataObjectDeserializer();
        if (data.getObject().isPresent()) return data.getObject().get();
        try {
            return data.deserializeUnsafe();
        } catch (EventDataObjectDeserializationException e) {
            throw new IllegalStateException("Stripe event " + event.getId() + " couldn't be read", e);
        }
    }

    static long toMinorUnits(BigDecimal amount, String currency) {
        try {
            return amount.setScale(decimals(currency), RoundingMode.UNNECESSARY)
                    .movePointRight(decimals(currency))
                    .longValueExact();
        } catch (ArithmeticException e) {
            throw new BusinessException(currency + " " + amount.toPlainString()
                    + " can't be charged by card: Stripe takes " + currency + " in whole units of "
                    + BigDecimal.ONE.movePointLeft(decimals(currency)).toPlainString()
                    + ". Pay by bank transfer instead");
        }
    }

    static BigDecimal fromMinorUnits(long amount, String currency) {
        return BigDecimal.valueOf(amount, decimals(currency)).setScale(2, RoundingMode.UNNECESSARY);
    }

    private static int decimals(String currency) {
        String c = currency == null ? "" : currency.toUpperCase(Locale.ROOT);
        if (ZERO_DECIMAL.contains(c)) return 0;
        if (THREE_DECIMAL.contains(c)) return 3;
        return 2;
    }
}
