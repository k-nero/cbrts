package com.equifreight.entity.enums;

/** {@code quotation_counter_offers.status}: where a club's counter-offer on one issued version stands. */
public enum CounterOfferStatus {
    /** Sent; the logistics manager hasn't answered yet. */
    OPEN,
    /** Answered with a newer version (answeredWithQuotation). */
    REVISED,
    /** Answered with a message: the version stands as the best price. */
    BEST_PRICE,
    /** Closed without an answer: the club accepted or declined, or the request was cancelled or rejected. */
    CLOSED
}
