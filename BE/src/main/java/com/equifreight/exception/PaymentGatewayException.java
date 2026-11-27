package com.equifreight.exception;

/**
 * The payment gateway (Stripe) failed or is unreachable. Mapped to HTTP 503 by {@code ControllerAdvise}: the request
 * was fine, so the client can retry later or pay by bank transfer. The message is shown to the user.
 */
public class PaymentGatewayException extends RuntimeException {
    public PaymentGatewayException(String message, Throwable cause) {
        super(message, cause);
    }
}
