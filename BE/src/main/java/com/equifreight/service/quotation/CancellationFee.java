package com.equifreight.service.quotation;

import com.equifreight.entity.RateFeeBand;
import java.math.BigDecimal;
import java.util.List;

/**
 * The cancellation fee band for the days left before departure (BR-F1-07): the band whose notice period holds those
 * days. A departure already past counts as no notice, the lowest band.
 */
public final class CancellationFee {

    private CancellationFee() {}

    /** Whether {@code band} holds {@code daysToDeparture}. */
    public static boolean applies(RateFeeBand band, long daysToDeparture) {
        long days = Math.max(0, daysToDeparture);
        return days >= band.getMinDays() && (band.getMaxDays() == null || days <= band.getMaxDays());
    }

    /** The fee % of the band that holds {@code daysToDeparture}; zero when no band holds it. */
    public static BigDecimal pctFor(List<RateFeeBand> bands, long daysToDeparture) {
        return bands.stream()
                .filter(b -> applies(b, daysToDeparture))
                .map(RateFeeBand::getValue)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }
}
