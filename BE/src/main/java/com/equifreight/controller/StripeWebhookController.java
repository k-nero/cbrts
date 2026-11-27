package com.equifreight.controller;

import com.equifreight.service.CardPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Stripe's webhook (database-design.md, 13A). Public, as Stripe sends no bearer token: each call is trusted only once
 * its {@code Stripe-Signature} matches the endpoint's signing secret. The body is read as the raw text it was signed
 * as. A non-2xx answer makes Stripe retry the event later.
 */
@RestController
public class StripeWebhookController {

    private final CardPaymentService cards;

    public StripeWebhookController(CardPaymentService cards) {
        this.cards = cards;
    }

    @Operation(summary = "Stripe's webhook: a card checkout of an invoice was paid or ran out")
    @PostMapping("/api/v1/public/webhooks/stripe")
    public ResponseEntity<Void> receive(
            @RequestBody String payload, @RequestHeader("Stripe-Signature") String signature) {
        cards.handle(payload, signature);
        return ResponseEntity.ok().build();
    }
}
