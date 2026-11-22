package com.equifreight.service.payment;

import com.equifreight.exception.BusinessException;
import java.util.Optional;

/** No Stripe key is configured: invoices are paid by bank transfer only, and card checkout is refused. */
public final class DisabledCardGateway implements CardGateway {

    private static final String OFF =
            "Card payment isn't set up on this server. Pay by bank transfer, with the invoice "
                    + "code as the reference";

    @Override
    public boolean enabled() {
        return false;
    }

    @Override
    public Session open(Checkout checkout, String idempotencyKey) {
        throw new BusinessException(OFF);
    }

    @Override
    public boolean expire(String sessionId) {
        throw new BusinessException(OFF);
    }

    @Override
    public String refund(String paymentIntent, String idempotencyKey) {
        throw new BusinessException(OFF);
    }

    @Override
    public Optional<Event> parse(String payload, String signature) {
        throw new BusinessException(OFF);
    }
}
