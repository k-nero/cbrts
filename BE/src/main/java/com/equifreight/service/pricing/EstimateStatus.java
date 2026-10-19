package com.equifreight.service.pricing;

/** Where the customer's estimate stands (spec §5.1). */
public enum EstimateStatus {
    /** A range. */
    READY,
    /** The catalog can't price it yet; the message says what is missing. */
    UNAVAILABLE,
    /** The request has no route or no horses yet. */
    NOT_READY,
    /** We don't run the route. */
    NOT_RUN
}
