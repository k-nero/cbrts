package com.equifreight.model.invoice;

import java.time.Instant;
import lombok.Builder;

/**
 * Where to send the customer to pay an invoice by card: the payment gateway's hosted page for the amount due, open
 * until {@code expiresAt}.
 */
@Builder
public record CardCheckoutResponse(String url, Instant expiresAt) {}
