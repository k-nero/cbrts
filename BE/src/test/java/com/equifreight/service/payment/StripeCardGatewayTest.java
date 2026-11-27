package com.equifreight.service.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.equifreight.exception.BusinessException;
import com.equifreight.exception.UnauthorizedException;
import com.stripe.Stripe;
import com.stripe.StripeClient;
import com.stripe.net.Webhook;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StripeCardGatewayTest {

    private static final String SECRET = "whsec_test_secret";
    private final StripeCardGateway gateway = new StripeCardGateway(new StripeClient("sk_test_unused"), SECRET);

    private static String event(String type, String paymentStatus) {
        return """
                {"id":"evt_1","object":"event","api_version":"%s","type":"%s","created":1761274800,
                 "data":{"object":{"id":"cs_test_1","object":"checkout.session","status":"complete",
                 "payment_status":"%s","payment_intent":"pi_1","amount_total":100200,"currency":"usd"}}}
                """.formatted(Stripe.API_VERSION, type, paymentStatus);
    }

    private static String sign(String payload) throws Exception {
        long t = Webhook.Util.getTimeNow();
        return "t=" + t + ",v1=" + Webhook.Util.computeHmacSha256(SECRET, t + "." + payload);
    }

    @Test
    @DisplayName("Amounts go to Stripe in the currency's smallest unit, and come back the same")
    void minorUnits() {
        assertEquals(100200L, StripeCardGateway.toMinorUnits(new BigDecimal("1002.00"), "USD"));
        assertEquals(25_000_000L, StripeCardGateway.toMinorUnits(new BigDecimal("25000000.00"), "VND"));
        assertEquals(new BigDecimal("1002.00"), StripeCardGateway.fromMinorUnits(100200L, "USD"));
        assertEquals(new BigDecimal("25000000.00"), StripeCardGateway.fromMinorUnits(25_000_000L, "VND"));
        BusinessException part = assertThrows(
                BusinessException.class, () -> StripeCardGateway.toMinorUnits(new BigDecimal("1.50"), "VND"));
        assertEquals(
                "VND 1.50 can't be charged by card: Stripe takes VND in whole units of 1. Pay by bank transfer instead",
                part.getMessage());
    }

    @Test
    @DisplayName("A signed paid checkout is read as a payment, with its amount")
    void paidEvent() throws Exception {
        String payload = event("checkout.session.completed", "paid");

        Optional<CardGateway.Event> read = gateway.parse(payload, sign(payload));

        assertEquals(
                Optional.of(new CardGateway.Event(
                        CardGateway.Event.Kind.PAID, "cs_test_1", "pi_1", new BigDecimal("1002.00"), "USD")),
                read);
    }

    @Test
    @DisplayName("A checkout paid in a converted currency is read in the invoice's own currency and amount")
    void convertedCurrency() throws Exception {
        String payload = event("checkout.session.completed", "paid")
                .replace(
                        "\"amount_total\":100200,\"currency\":\"usd\"",
                        "\"amount_total\":26887252,\"currency\":\"vnd\",\"currency_conversion\":"
                                + "{\"amount_total\":100200,\"amount_subtotal\":100200,\"fx_rate\":\"26833.58\","
                                + "\"source_currency\":\"usd\"}");

        CardGateway.Event read = gateway.parse(payload, sign(payload)).orElseThrow();

        assertEquals(new BigDecimal("1002.00"), read.amount());
        assertEquals("USD", read.currency());
    }

    @Test
    @DisplayName("A completed checkout whose money hasn't come in yet is not a payment")
    void completedButUnpaid() throws Exception {
        String payload = event("checkout.session.completed", "unpaid");
        assertTrue(gateway.parse(payload, sign(payload)).isEmpty());
    }

    @Test
    @DisplayName("An expired checkout is read as expired; other events are left alone")
    void expiredAndOtherEvents() throws Exception {
        String expired = event("checkout.session.expired", "unpaid");
        assertEquals(
                CardGateway.Event.Kind.EXPIRED,
                gateway.parse(expired, sign(expired)).orElseThrow().kind());
        String other = event("customer.created", "unpaid");
        assertTrue(gateway.parse(other, sign(other)).isEmpty());
    }

    @Test
    @DisplayName("A call whose signature doesn't match the webhook secret is refused")
    void badSignature() throws Exception {
        String payload = event("checkout.session.completed", "paid");
        String forged = sign(payload.replace("100200", "1"));
        assertThrows(UnauthorizedException.class, () -> gateway.parse(payload, forged));
        assertThrows(UnauthorizedException.class, () -> gateway.parse(payload, "t=1,v1=00"));
    }
}
