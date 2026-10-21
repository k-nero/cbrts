package com.equifreight.service.pricing;

import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Turns a priced quote into the customer's range (BR-Q-11): the total widened by the catalog's estimate band, or
 * by the share of ESTIMATED lines when that is wider, and rounded outward to $100.
 */
public final class EstimateBand {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final String NOT_YET = "No estimate yet: ";

    private EstimateBand() {}

    public static EstimateResult of(PricedQuote quote, RateSet rates) {
        if (quote.fit() != null && quote.fit().refusal() != null) {
            return EstimateResult.unavailable(
                    EstimateStatus.UNAVAILABLE, quote.fit().refusal());
        }
        if (!quote.missing().isEmpty()) {
            return EstimateResult.unavailable(
                    EstimateStatus.UNAVAILABLE,
                    NOT_YET + quote.missing().getFirst().why());
        }
        BigDecimal bandPct = rates.policies().get(RatePolicyKey.ESTIMATE_BAND_PCT);
        if (bandPct == null) {
            return EstimateResult.unavailable(
                    EstimateStatus.UNAVAILABLE, NOT_YET + "the rate catalog has no estimate band.");
        }
        BigDecimal total = quote.totals().total();
        BigDecimal estimated = quote.lines().stream()
                .filter(l -> l.certainty() == LineCertainty.ESTIMATED && l.amount() != null)
                .map(PricedLine::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal share = total.signum() == 0 ? BigDecimal.ZERO : estimated.divide(total, 6, RoundingMode.HALF_UP);
        BigDecimal width = bandPct.divide(HUNDRED, 6, RoundingMode.HALF_UP).max(share);
        BigDecimal low = total.multiply(BigDecimal.ONE.subtract(width))
                .setScale(-2, RoundingMode.FLOOR)
                .max(BigDecimal.ZERO);
        BigDecimal high = total.multiply(BigDecimal.ONE.add(width)).setScale(-2, RoundingMode.CEILING);
        return EstimateResult.range(low.setScale(2), high.setScale(2));
    }
}
