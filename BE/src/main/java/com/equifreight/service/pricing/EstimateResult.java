package com.equifreight.service.pricing;

import java.math.BigDecimal;

/** A range for the customer (BR-Q-11), or why there is none; never a single figure and never a quotation. */
public record EstimateResult(EstimateStatus status, BigDecimal low, BigDecimal high, String message) {

    public static EstimateResult range(BigDecimal low, BigDecimal high) {
        return new EstimateResult(EstimateStatus.READY, low, high, null);
    }

    public static EstimateResult unavailable(EstimateStatus status, String message) {
        return new EstimateResult(status, null, null, message);
    }
}
