package com.equifreight.entity.enums;

/**
 * {@code card_checkouts.status}: an online card checkout's outcome (database-design.md, 13A).
 */
public enum CardCheckoutStatus {
    /** The customer was sent to Stripe's page and hasn't paid yet. */
    OPEN,
    /** Stripe confirmed the money; the payment is recorded against the invoice. */
    PAID,
    /** Not paid before it ran out, or closed because a newer checkout replaced it. */
    EXPIRED,
    /** Paid after the invoice stopped being owed (paid another way, voided, or the amount changed): sent back. */
    REFUNDED
}
