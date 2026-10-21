package com.equifreight.service.pricing;

import static com.equifreight.service.pricing.PricingFixtures.classRow;
import static com.equifreight.service.pricing.PricingFixtures.horse;
import static com.equifreight.service.pricing.PricingFixtures.hourLine;
import static com.equifreight.service.pricing.PricingFixtures.kmLine;
import static com.equifreight.service.pricing.PricingFixtures.line;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgBusiness;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgLines;
import static com.equifreight.service.pricing.PricingFixtures.rates;
import static com.equifreight.service.pricing.PricingFixtures.road;
import static com.equifreight.service.pricing.PricingFixtures.sexLine;
import static com.equifreight.service.pricing.PricingFixtures.standardBreaks;
import static com.equifreight.service.pricing.PricingFixtures.standardPolicies;
import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** BR-Q-11: the customer's estimate is a range at least the catalog's band wide, never narrower than its uncertainty. */
class EstimateBandTest {

    /** Hanoi → Vientiane by private trailer, one gelding: groom $480 + isolation $490 + 700 km × $3.60. */
    static List<RateRow> roadLines(RateRow... extra) {
        List<RateRow> lines = new ArrayList<>(List.of(
                line("GROOM", "D", "Groom, road escort", RateBasis.PER_THREE_HORSES, "480"),
                sexLine("ISO_GELDING", "B", "Pre-export isolation", HorseSex.GELDING, "70"),
                kmLine("ROAD_PRIVATE", "Road freight, private trailer", TrailerType.PRIVATE, "3.60", "400")));
        lines.addAll(List.of(extra));
        return lines;
    }

    static PricingInput oneGelding() {
        return road(TrailerType.PRIVATE, 700, 0, List.of(horse("Lotus Crown", HorseSex.GELDING, "M", 32, "90000")));
    }

    static EstimateResult estimate(PricingInput in, RateSet rates) {
        return EstimateBand.of(QuotePricer.price(in, rates), rates);
    }

    @Test
    void aCompleteQuoteGivesTheFloorBandRoundedOutward() {
        RateSet rates = rates(List.of(), roadLines());
        // $3,490 + 5% contingency + 12% service fee = $4,104.24; ± 15% is $3,488.60 – $4,719.88.
        assertThat(QuotePricer.price(oneGelding(), rates).totals().total()).isEqualByComparingTo("4104.24");

        EstimateResult result = estimate(oneGelding(), rates);

        assertThat(result.status()).isEqualTo(EstimateStatus.READY);
        assertThat(result.low()).isEqualByComparingTo("3400");
        assertThat(result.high()).isEqualByComparingTo("4800");
        assertThat(result.message()).isNull();
    }

    @Test
    void estimatedLinesWidenTheBandBeyondTheFloor() {
        RateSet rates = rates(
                List.of(),
                roadLines(hourLine("WAITING", "H", "Waiting at the border", "1000", "2", "Billed by the hour.")));
        // $5,490 + 5% + 12% = $6,456.24, of which $2,000 is estimated (31%): wider than the 15% floor.
        assertThat(QuotePricer.price(oneGelding(), rates).totals().total()).isEqualByComparingTo("6456.24");

        EstimateResult result = estimate(oneGelding(), rates);

        assertThat(result.low()).isEqualByComparingTo("4400");
        assertThat(result.high()).isEqualByComparingTo("8500");
    }

    @Test
    void aMissingRateGivesItsReason() {
        RateSet noBusiness = rates(List.of(classRow(ServiceClass.ECONOMY, 32, "16800")), pnhHkgLines());

        EstimateResult result = estimate(pnhHkgBusiness(), noBusiness);

        assertThat(result.status()).isEqualTo(EstimateStatus.UNAVAILABLE);
        assertThat(result.low()).isNull();
        assertThat(result.message())
                .isEqualTo("No estimate yet: Rate catalog v2 has no business stall rate for AIR PNH → HKG.");
    }

    @Test
    void aRefusedFitGivesTheRefusal() {
        PricingInput wide = PricingFixtures.air(
                ServiceClass.BUSINESS, List.of(horse("Lotus Crown", HorseSex.GELDING, "XL", 96, "1000")));

        EstimateResult result = estimate(wide, PricingFixtures.pnhHkgRates());

        assertThat(result.status()).isEqualTo(EstimateStatus.UNAVAILABLE);
        assertThat(result.message()).isEqualTo("Lotus Crown is size XL (96 in); business gives 48 in.");
    }

    @Test
    void noBandPolicyGivesItsReason() {
        Map<RatePolicyKey, BigDecimal> noBand = new EnumMap<>(standardPolicies());
        noBand.remove(RatePolicyKey.ESTIMATE_BAND_PCT);
        RateSet rates = new RateSet(2, List.of(), roadLines(), standardBreaks(), noBand);

        EstimateResult result = estimate(oneGelding(), rates);

        assertThat(result.status()).isEqualTo(EstimateStatus.UNAVAILABLE);
        assertThat(result.message()).isEqualTo("No estimate yet: the rate catalog has no estimate band.");
    }

    @Test
    void theLowEndNeverGoesBelowZero() {
        Map<RatePolicyKey, BigDecimal> wide = new EnumMap<>(standardPolicies());
        wide.put(RatePolicyKey.ESTIMATE_BAND_PCT, new BigDecimal("100"));
        RateSet rates = new RateSet(2, List.of(), roadLines(), standardBreaks(), wide);

        EstimateResult result = estimate(oneGelding(), rates);

        assertThat(result.low()).isEqualByComparingTo("0");
        assertThat(result.high()).isEqualByComparingTo("8300");
    }
}
