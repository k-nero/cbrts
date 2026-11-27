package com.equifreight.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Online card payment of invoices ({@code app.payment.*}, database-design.md 13A).
 *
 * @param returnUrl the web app's origin ({@code http://localhost:3000}); Stripe sends the customer back to the invoice
 *                  page under it once they have paid or given up
 * @param stripe    the Stripe account; a blank secret key turns card payment off
 */
@ConfigurationProperties("app.payment")
public record PaymentProperties(String returnUrl, Stripe stripe) {

    /**
     * @param secretKey     the account's secret API key ({@code sk_test_...} outside production); blank means card
     *                      payment is off and customers pay by bank transfer only
     * @param webhookSecret the signing secret of the webhook endpoint ({@code whsec_...}), from the Stripe dashboard or
     *                      {@code stripe listen}
     */
    public record Stripe(String secretKey, String webhookSecret) {}

    public boolean cardEnabled() {
        return stripe != null
                && stripe.secretKey() != null
                && !stripe.secretKey().isBlank();
    }
}
