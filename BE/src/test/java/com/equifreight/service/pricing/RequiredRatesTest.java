package com.equifreight.service.pricing;

import static com.equifreight.service.pricing.PricingFixtures.air;
import static com.equifreight.service.pricing.PricingFixtures.classRow;
import static com.equifreight.service.pricing.PricingFixtures.horse;
import static com.equifreight.service.pricing.PricingFixtures.kmLine;
import static com.equifreight.service.pricing.PricingFixtures.line;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgBusiness;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgLines;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgRates;
import static com.equifreight.service.pricing.PricingFixtures.rates;
import static com.equifreight.service.pricing.PricingFixtures.road;
import static com.equifreight.service.pricing.PricingFixtures.sexLine;
import static com.equifreight.service.pricing.PricingFixtures.standardBreaks;
import static com.equifreight.service.pricing.PricingFixtures.standardPolicies;
import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RequiredRatesTest {

    private static List<String> descriptions(List<MissingRate> missing) {
        return missing.stream().map(MissingRate::description).toList();
    }

    private static List<RateRow> without(List<RateRow> lines, String... codes) {
        List<String> drop = List.of(codes);
        return lines.stream().filter(l -> !drop.contains(l.code())).toList();
    }

    private static List<RateRow> roadLines(RateRow... extra) {
        List<RateRow> lines = new ArrayList<>(List.of(
                line("GROOM", "D", "Groom, road escort", RateBasis.PER_THREE_HORSES, "480"),
                sexLine("ISO_STALLION", "B", "Pre-export isolation", HorseSex.STALLION, "140"),
                sexLine("ISO_MARE", "B", "Pre-export isolation", HorseSex.MARE, "85"),
                sexLine("ISO_GELDING", "B", "Pre-export isolation", HorseSex.GELDING, "70")));
        lines.addAll(List.of(extra));
        return lines;
    }

    @Test
    void aCompleteAirRequestMissesNothing() {
        assertThat(RequiredRates.forRequest(pnhHkgBusiness(), pnhHkgRates())).isEmpty();
    }

    @Test
    void anAirRequestWithoutItsClassRowMissesTheStallRate() {
        RateSet rates = rates(List.of(classRow(ServiceClass.ECONOMY, 32, "16800")), pnhHkgLines());

        List<MissingRate> missing = RequiredRates.forRequest(pnhHkgBusiness(), rates);

        assertThat(missing)
                .containsExactly(new MissingRate(
                        "C",
                        "Air stall position Phnom Penh → Hong Kong, business",
                        "Rate catalog v2 has no business stall rate for AIR PNH → HKG."));
    }

    @Test
    void aRoadRequestNeedsTheRoadLineForItsTrailer() {
        PricingInput privateMove =
                road(TrailerType.PRIVATE, 700, 0, List.of(horse("Lotus Crown", HorseSex.GELDING, "M", 32, "90000")));
        RateSet sharedOnly =
                rates(List.of(), roadLines(kmLine("ROAD_SHARED", "Road freight", TrailerType.SHARED, "2.40", "400")));

        assertThat(RequiredRates.forRequest(privateMove, sharedOnly))
                .containsExactly(new MissingRate(
                        "C",
                        "Road freight Hanoi → Vientiane, private trailer",
                        "Rate catalog v2 has no private-trailer road rate for RD HAN → VTE."));

        RateSet eitherTrailer = rates(List.of(), roadLines(kmLine("ROAD", "Road freight", null, "3.00", null)));
        assertThat(RequiredRates.forRequest(privateMove, eitherTrailer)).isEmpty();
    }

    @Test
    void crossingsNeedACrossingLine() {
        RateSet rates = rates(List.of(), roadLines(kmLine("ROAD", "Road freight", null, "3.00", null)));
        List<com.equifreight.service.pricing.PricingHorse> horses =
                List.of(horse("Lotus Crown", HorseSex.GELDING, "M", 32, "90000"));

        assertThat(RequiredRates.forRequest(road(TrailerType.SHARED, 700, 1, horses), rates))
                .containsExactly(new MissingRate(
                        "E",
                        "Customs and border documentation",
                        "Rate catalog v2 has no border crossing fee for RD HAN → VTE."));
        assertThat(RequiredRates.forRequest(road(TrailerType.SHARED, 700, 0, horses), rates))
                .isEmpty();
    }

    @Test
    void eachSexPresentNeedsAPreExportDayLine() {
        PricingInput stallionAndMare = air(
                ServiceClass.BUSINESS,
                List.of(
                        horse("Thunder", HorseSex.STALLION, "M", 32, "100000"),
                        horse("Nightfall", HorseSex.MARE, "M", 32, "100000")));

        RateSet mareOnly = rates(pnhHkgRates().classes(), without(pnhHkgLines(), "ISO_STALLION"));
        assertThat(RequiredRates.forRequest(stallionAndMare, mareOnly))
                .containsExactly(new MissingRate(
                        "B",
                        "Pre-export isolation · stallion",
                        "Rate catalog v2 has no isolation rate for a stallion on AIR PNH → HKG."));

        List<RateRow> anySex = new ArrayList<>(without(pnhHkgLines(), "ISO_STALLION", "ISO_MARE", "ISO_GELDING"));
        anySex.add(line("ISO", "B", "Pre-export isolation", RateBasis.PER_DAY, "90"));
        assertThat(RequiredRates.forRequest(stallionAndMare, rates(pnhHkgRates().classes(), anySex)))
                .isEmpty();

        // The post-arrival line (group F, no sex) is not a pre-export rate.
        List<RateRow> postArrivalOnly = without(pnhHkgLines(), "ISO_STALLION", "ISO_MARE", "ISO_GELDING");
        assertThat(descriptions(RequiredRates.forRequest(
                        stallionAndMare, rates(pnhHkgRates().classes(), postArrivalOnly))))
                .containsExactly("Pre-export isolation · stallion", "Pre-export isolation · mare");
    }

    @Test
    void unknownQuarantineDaysAreMissingWhenDayLinesApply() {
        PricingInput unknown = withDays(pnhHkgBusiness(), null);
        assertThat(RequiredRates.forRequest(unknown, pnhHkgRates()))
                .containsExactly(new MissingRate(
                        null, "Quarantine days", "No quarantine days for Hong Kong in the regulation catalog."));

        RateSet noIsolation = rates(pnhHkgRates().classes(), without(pnhHkgLines(), "ISO_MARE", "ISO_GELDING"));
        assertThat(RequiredRates.forRequest(withDays(pnhHkgBusiness(), 0), noIsolation))
                .isEmpty();
    }

    @Test
    void policiesTheQuoteUsesAreRequired() {
        Map<RatePolicyKey, BigDecimal> none = Map.of();
        RateSet air = new RateSet(2, pnhHkgRates().classes(), pnhHkgLines(), standardBreaks(), none);
        assertThat(descriptions(RequiredRates.forRequest(pnhHkgBusiness(), air)))
                .containsExactly(
                        "Contingency",
                        "Service fee",
                        "Fuel surcharge",
                        "Transit insurance",
                        "Flight vet threshold",
                        "High value threshold");

        List<com.equifreight.service.pricing.PricingHorse> horses =
                List.of(horse("Lotus Crown", HorseSex.GELDING, "M", 32, "90000"));
        RateSet road =
                new RateSet(2, List.of(), roadLines(kmLine("ROAD", "Road freight", null, "3", null)), List.of(), none);
        List<MissingRate> roadMissing = RequiredRates.forRequest(road(TrailerType.SHARED, 700, 0, horses), road);
        assertThat(descriptions(roadMissing)).containsExactly("Contingency", "Service fee");
        assertThat(roadMissing.getFirst().why()).isEqualTo("Rate catalog v2 has no contingency value.");
    }

    @Test
    void aCorridorNeedsEveryClassOrBothTrailers() {
        RateSet businessOnly = new RateSet(
                2,
                List.of(classRow(ServiceClass.BUSINESS, 48, "16800")),
                pnhHkgLines(),
                standardBreaks(),
                standardPolicies());
        assertThat(descriptions(RequiredRates.forCorridor(
                        TransportMode.AIR, "AIR PNH → HKG", "Phnom Penh", "Hong Kong", 0, businessOnly)))
                .containsExactly(
                        "Air stall position Phnom Penh → Hong Kong, economy",
                        "Air stall position Phnom Penh → Hong Kong, first");

        RateSet sharedOnly = new RateSet(
                2,
                List.of(),
                List.of(kmLine("ROAD_SHARED", "Road freight", TrailerType.SHARED, "2.4", "400")),
                standardBreaks(),
                standardPolicies());
        assertThat(descriptions(RequiredRates.forCorridor(
                        TransportMode.ROAD, "RD HAN → VTE", "Hanoi", "Vientiane", 1, sharedOnly)))
                .containsExactly(
                        "Road freight Hanoi → Vientiane, private trailer",
                        "Customs and border documentation",
                        "Groom",
                        "Pre-export isolation · stallion",
                        "Pre-export isolation · mare",
                        "Pre-export isolation · gelding");
    }

    @Test
    void ownCoverNeedsNoInsurancePercentage() {
        PricingInput own = new PricingInput(
                TransportMode.AIR,
                "AIR PNH → HKG",
                "Phnom Penh",
                "Hong Kong",
                "Hong Kong",
                1550,
                0,
                ServiceClass.BUSINESS,
                null,
                InsuranceOption.OWN_POLICY,
                false,
                14,
                pnhHkgBusiness().horses());
        Map<RatePolicyKey, BigDecimal> noInsurance = new java.util.EnumMap<>(standardPolicies());
        noInsurance.remove(RatePolicyKey.INSURANCE_PCT);
        RateSet rates = new RateSet(2, pnhHkgRates().classes(), pnhHkgLines(), standardBreaks(), noInsurance);

        assertThat(RequiredRates.forRequest(own, rates)).isEmpty();
    }

    private static PricingInput withDays(PricingInput in, Integer days) {
        return new PricingInput(
                in.mode(),
                in.corridorCode(),
                in.fromCity(),
                in.toCity(),
                in.destinationCountryName(),
                in.distanceKm(),
                in.crossingCount(),
                in.airClass(),
                in.trailer(),
                in.insurance(),
                in.vetEscort(),
                days,
                in.horses());
    }

    @Test
    void coltsAndFilliesUseTheStallionAndMareRates() {
        PricingInput young = air(
                ServiceClass.BUSINESS,
                List.of(
                        horse("Young Thunder", HorseSex.COLT, "M", 32, "50000"),
                        horse("Little Star", HorseSex.FILLY, "M", 32, "50000")));
        assertThat(RequiredRates.forRequest(young, pnhHkgRates())).isEmpty();

        RateSet noStallion = rates(pnhHkgRates().classes(), without(pnhHkgLines(), "ISO_STALLION"));
        assertThat(descriptions(RequiredRates.forRequest(young, noStallion)))
                .containsExactly("Pre-export isolation · stallion");
    }
}
