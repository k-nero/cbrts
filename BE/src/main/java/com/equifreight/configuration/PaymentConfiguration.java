package com.equifreight.configuration;

import com.equifreight.service.payment.CardGateway;
import com.equifreight.service.payment.DisabledCardGateway;
import com.equifreight.service.payment.StripeCardGateway;
import com.stripe.StripeClient;
import lombok.extern.log4j.Log4j2;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Online card payment (database-design.md, 13A). Decided from the properties at startup rather than with
 * {@code @ConditionalOnProperty}, which Spring AOT would fix at build time: with no Stripe secret key, card checkout is
 * off and invoices are paid by bank transfer only.
 */
@Log4j2
@Configuration
@EnableConfigurationProperties(PaymentProperties.class)
public class PaymentConfiguration {

    @Bean
    public CardGateway cardGateway(PaymentProperties properties) {
        if (!properties.cardEnabled()) {
            log.info("Card payment is off: app.payment.stripe.secret-key is not set");
            return new DisabledCardGateway();
        }
        String webhookSecret = properties.stripe().webhookSecret();
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new IllegalStateException("app.payment.stripe.webhook-secret is required with a Stripe secret key: "
                    + "without it no card payment could be confirmed");
        }
        if (properties.returnUrl() == null || properties.returnUrl().isBlank()) {
            throw new IllegalStateException("app.payment.return-url is required with a Stripe secret key");
        }
        if (properties.stripe().secretKey().startsWith("sk_live_")) {
            log.warn("Card payment uses a live Stripe key: real cards will be charged");
        }
        return new StripeCardGateway(new StripeClient(properties.stripe().secretKey()), webhookSecret);
    }
}
