package com.equifreight.service.pricing;

import static com.equifreight.service.pricing.PricingFixtures.air;
import static com.equifreight.service.pricing.PricingFixtures.classRow;
import static com.equifreight.service.pricing.PricingFixtures.d;
import static com.equifreight.service.pricing.PricingFixtures.foal;
import static com.equifreight.service.pricing.PricingFixtures.horse;
import static com.equifreight.service.pricing.PricingFixtures.kmLine;
import static com.equifreight.service.pricing.PricingFixtures.line;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgBusiness;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgLines;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgRates;
import static com.equifreight.service.pricing.PricingFixtures.rates;
import static com.equifreight.service.pricing.PricingFixtures.road;
import static com.equifreight.service.pricing.PricingFixtures.sexLine;
import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class QuotePricerTest {

    private static BigDecimal group(PricedQuote quote, String group) {
        return quote.lines().stream()
                .filter(l -> l.group().equals(group))
                .map(PricedLine::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static TotalRow row(PricedQuote quote, String key) {
        return quote.totals().rows().stream()
                .filter(r -> r.key().equals(key))
                .findFirst()
                .orElse(null);
    }

    private static PricedLine find(PricedQuote quote, String descriptionStart) {
        return quote.lines().stream()
                .filter(l -> l.description().startsWith(descriptionStart))
                .findFirst()
                .orElse(null);
    }

    private static List<PricedLine> findAll(PricedQuote quote, String descriptionStart) {
        return quote.lines().stream()
                .filter(l -> l.description().startsWith(descriptionStart))
                .toList();
    }

    private static List<PricingHorse> sizeS(int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> horse("Horse " + i, HorseSex.GELDING, "S", 32, "50000"))
                .toList();
    }

    private static PricingInput withVetEscort(PricingInput in) {
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
                true,
                in.quarantineDays(),
                in.horses());
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

    private static PricingInput withInsurance(PricingInput in, InsuranceOption insurance) {
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
                insurance,
                in.vetEscort(),
                in.quarantineDays(),
                in.horses());
    }

    @Test
    void theFixturePricesToTheCent() {
        PricedQuote quote = QuotePricer.price(pnhHkgBusiness(), pnhHkgRates());

        assertThat(quote.missing()).isEmpty();
        assertThat(group(quote, "A")).isEqualByComparingTo("490.00");
        assertThat(group(quote, "B")).isEqualByComparingTo("2790.00");
        assertThat(group(quote, "C")).isEqualByComparingTo("17750.00");
        assertThat(group(quote, "D")).isEqualByComparingTo("1450.00");
        assertThat(group(quote, "E")).isEqualByComparingTo("740.00");
        assertThat(group(quote, "F")).isEqualByComparingTo("2660.00");
        assertThat(group(quote, "G")).isEqualByComparingTo("300.00");
        assertThat(group(quote, "H")).isEqualByComparingTo("190.00");

        PricedTotals totals = quote.totals();
        assertThat(totals.subtotal()).isEqualByComparingTo("26370.00");
        assertThat(totals.volumeBreak()).isEqualByComparingTo("927.00");
        assertThat(totals.fuel()).isEqualByComparingTo("3035.25");
        assertThat(totals.insurance()).isEqualByComparingTo("4875.00");
        assertThat(totals.contingency()).isEqualByComparingTo("1667.66");
        assertThat(totals.serviceFee()).isEqualByComparingTo("4202.51");
        assertThat(totals.total()).isEqualByComparingTo("39223.42");

        assertThat(row(quote, "VOLUME_BREAK"))
                .isEqualTo(new TotalRow(
                        "VOLUME_BREAK",
                        "Volume break, 2–3 horses",
                        "5% of air and ground lines (A, C, G) · $18,540.00",
                        d("927.00")));
        assertThat(row(quote, "FUEL").baseText()).isEqualTo("18% of air lines (C) after the volume break · $16,862.50");
        assertThat(row(quote, "INSURANCE").baseText()).isEqualTo("1.5% of declared value · $325,000.00");
        assertThat(row(quote, "CONTINGENCY").baseText()).isEqualTo("5% of $33,353.25");
        assertThat(row(quote, "SERVICE_FEE").baseText()).isEqualTo("12% after contingency · $35,020.91");

        assertThat(find(quote, "Flight veterinarian")).isNull();
        assertThat(find(quote, "Customs and border documentation")).isNull();

        PricedLine stall = quote.lines().stream()
                .filter(l -> l.group().equals("C"))
                .findFirst()
                .orElseThrow();
        assertThat(stall.description()).isEqualTo("Air stall position Phnom Penh → Hong Kong, business");
        assertThat(stall.basis()).isEqualTo(RateBasis.PER_POSITION);
        assertThat(stall.basisText()).isEqualTo("business gives each horse 48 in · 2 × 48 in = 96 in = 1 position");
        assertThat(stall.rateServiceClassId()).isNotNull();
        assertThat(stall.source()).isEqualTo(LineSource.CATALOG);

        PricedLine postArrival = find(quote, "Post-arrival isolation");
        assertThat(postArrival.quantity()).isEqualByComparingTo("28");
        assertThat(postArrival.basisText()).isEqualTo("per horse per day · 2 × 14 days");

        PricedLine waiting = find(quote, "Waiting time");
        assertThat(waiting.certainty()).isEqualTo(LineCertainty.ESTIMATED);
        assertThat(waiting.estimateNote()).isEqualTo("Billed by the hour if the flight or border queue runs late.");
        assertThat(waiting.basisText()).isEqualTo("per hour · 2 h estimated");

        assertThat(quote.fit()).isEqualTo(new StallFit(1, 96, null, List.of()));
    }

    @Test
    void groomsAreOnePerThreeHorses() {
        int[][] cases = {{1, 1}, {3, 1}, {4, 2}, {7, 3}};
        for (int[] c : cases) {
            PricedQuote quote = QuotePricer.price(air(ServiceClass.FIRST, sizeS(c[0])), pnhHkgRates());
            PricedLine groom = find(quote, "Flying groom");
            assertThat(groom.quantity()).as("%d horses", c[0]).isEqualByComparingTo(String.valueOf(c[1]));
            assertThat(groom.basisText()).isEqualTo("one per three horses · " + c[0] + " ÷ 3, rounded up = " + c[1]);
        }
    }

    @Test
    void theFlightVetComesWithEightHorsesAHighValueOrAVetEscort() {
        assertThat(find(QuotePricer.price(air(ServiceClass.FIRST, sizeS(7)), pnhHkgRates()), "Flight veterinarian"))
                .isNull();

        PricedLine eight =
                find(QuotePricer.price(air(ServiceClass.FIRST, sizeS(8)), pnhHkgRates()), "Flight veterinarian");
        assertThat(eight.quantity()).isEqualByComparingTo("1");
        assertThat(eight.basisText()).isEqualTo("8 or more horses");

        PricingInput highValue = air(ServiceClass.FIRST, List.of(horse("Star", HorseSex.MARE, "S", 32, "250000.01")));
        assertThat(find(QuotePricer.price(highValue, pnhHkgRates()), "Flight veterinarian")
                        .basisText())
                .isEqualTo("a declared value above $250,000.00");

        PricingInput atThreshold = air(ServiceClass.FIRST, List.of(horse("Star", HorseSex.MARE, "S", 32, "250000.00")));
        assertThat(find(QuotePricer.price(atThreshold, pnhHkgRates()), "Flight veterinarian"))
                .isNull();

        assertThat(find(QuotePricer.price(withVetEscort(atThreshold), pnhHkgRates()), "Flight veterinarian")
                        .basisText())
                .isEqualTo("vet escort requested");
    }

    private static RateSet roadRates(RateRow... extra) {
        List<RateRow> lines = new ArrayList<>(List.of(
                line("GROOM", "D", "Groom, road escort", RateBasis.PER_THREE_HORSES, "480"),
                sexLine("ISO_GELDING", "B", "Pre-export isolation", HorseSex.GELDING, "70")));
        lines.addAll(List.of(extra));
        return rates(List.of(), lines);
    }

    @Test
    void aShortRoadMoveChargesTheMinimum() {
        PricingInput shortMove =
                road(TrailerType.PRIVATE, 100, 0, List.of(horse("Lotus Crown", HorseSex.GELDING, "M", 32, "90000")));
        PricedQuote quote = QuotePricer.price(
                shortMove,
                roadRates(kmLine("ROAD_PRIVATE", "Road freight, private trailer", TrailerType.PRIVATE, "3.60", "400")));

        PricedLine freight = find(quote, "Road freight");
        assertThat(freight.amount()).isEqualByComparingTo("400.00");
        assertThat(freight.quantity()).isEqualByComparingTo("100");
        assertThat(freight.unitRate()).isEqualByComparingTo("3.60");
        assertThat(freight.basisText()).isEqualTo("per km · 100 km · minimum charge applies");
    }

    @Test
    void roadLinesFollowTheTrailer() {
        RateSet rates = roadRates(
                kmLine("ROAD_SHARED", "Road freight, shared load", TrailerType.SHARED, "2.40", "400"),
                kmLine("ROAD_PRIVATE", "Road freight, private trailer", TrailerType.PRIVATE, "3.60", "400"),
                kmLine("ROAD_FUEL", "Road toll allowance", null, "0.10", null));
        PricingInput shared =
                road(TrailerType.SHARED, 700, 0, List.of(horse("Lotus Crown", HorseSex.GELDING, "M", 32, "90000")));

        PricedQuote quote = QuotePricer.price(shared, rates);

        assertThat(findAll(quote, "Road freight"))
                .extracting(PricedLine::description)
                .containsExactly("Road freight, shared load");
        assertThat(find(quote, "Road freight").amount()).isEqualByComparingTo("1680.00");
        assertThat(find(quote, "Road freight").basisText()).isEqualTo("per km · 700 km");
        assertThat(find(quote, "Road toll allowance").amount()).isEqualByComparingTo("70.00");

        List<RateRow> airLines = new ArrayList<>(pnhHkgLines());
        airLines.add(kmLine("STRAY_KM", "A per-km line", null, "1", null));
        assertThat(find(QuotePricer.price(pnhHkgBusiness(), rates(pnhHkgRates().classes(), airLines)), "A per-km"))
                .isNull();
    }

    @Test
    void dayLinesFollowSex() {
        PricingInput stallionAndMare = air(
                ServiceClass.BUSINESS,
                List.of(
                        horse("Thunder", HorseSex.STALLION, "M", 32, "100000"),
                        horse("Nightfall", HorseSex.MARE, "M", 32, "100000")));

        PricedQuote quote = QuotePricer.price(stallionAndMare, pnhHkgRates());

        assertThat(findAll(quote, "Pre-export isolation"))
                .extracting(PricedLine::description, l -> l.quantity().intValue(), PricedLine::basisText)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(
                                "Pre-export isolation · stallion", 14, "per day · 14 days × 1 horse"),
                        org.assertj.core.groups.Tuple.tuple(
                                "Pre-export isolation · mare", 14, "per day · 14 days × 1 horse"));

        PricedQuote noQuarantine = QuotePricer.price(withDays(stallionAndMare, 0), pnhHkgRates());
        assertThat(findAll(noQuarantine, "Pre-export isolation")).isEmpty();
        assertThat(findAll(noQuarantine, "Post-arrival isolation")).isEmpty();
    }

    @Test
    void threeBusinessHorsesTakeTwoPositions() {
        PricingInput three = air(
                ServiceClass.BUSINESS,
                List.of(
                        horse("One", HorseSex.MARE, "M", 32, "1000"),
                        horse("Two", HorseSex.MARE, "M", 32, "1000"),
                        horse("Three", HorseSex.MARE, "M", 32, "1000")));

        PricedQuote quote = QuotePricer.price(three, pnhHkgRates());

        assertThat(quote.fit()).isEqualTo(new StallFit(2, 144, null, List.of()));
        assertThat(find(quote, "Air stall position").amount()).isEqualByComparingTo("33600.00");
        assertThat(find(quote, "Air stall position").basisText())
                .isEqualTo("business gives each horse 48 in · 3 × 48 in = 144 in = 2 positions");
    }

    @Test
    void aHorseTooWideRefusesTheClass() {
        PricingInput wide =
                air(ServiceClass.BUSINESS, List.of(horse("Lotus Crown", HorseSex.GELDING, "XL", 96, "1000")));

        PricedQuote quote = QuotePricer.price(wide, pnhHkgRates());

        assertThat(find(quote, "Air stall position")).isNull();
        assertThat(quote.fit().refusal()).isEqualTo("Lotus Crown is size XL (96 in); business gives 48 in.");
        assertThat(quote.fit().achievableClasses()).containsExactly(ServiceClass.FIRST);
        assertThat(quote.totals().total()).isNull();
    }

    @Test
    void aMareWithFoalNeedsAFullBox() {
        PricingInput withFoal = air(ServiceClass.ECONOMY, List.of(foal("Nightfall", "M", 32, "1000")));

        PricedQuote quote = QuotePricer.price(withFoal, pnhHkgRates());

        assertThat(quote.fit().refusal())
                .isEqualTo("Nightfall travels with a foal and needs a full 96 in box; economy gives 32 in.");
        assertThat(quote.fit().achievableClasses()).containsExactly(ServiceClass.FIRST);
        assertThat(QuotePricer.fit(withFoal, pnhHkgRates())).isEqualTo(quote.fit());
    }

    @Test
    void aMissingRateLeavesThePricedLinesAndNoTotal() {
        RateSet noBusiness = rates(List.of(classRow(ServiceClass.ECONOMY, 32, "16800")), pnhHkgLines());

        PricedQuote quote = QuotePricer.price(pnhHkgBusiness(), noBusiness);

        PricedLine noRate = find(quote, "Air stall position");
        assertThat(noRate.source()).isEqualTo(LineSource.MANUAL);
        assertThat(noRate.amount()).isNull();
        assertThat(noRate.unitRate()).isNull();
        assertThat(noRate.basisText()).isEqualTo("No rate in the catalog");
        PricedTotals totals = quote.totals();
        assertThat(totals.pricedLines()).isEqualByComparingTo("9570.00");
        assertThat(totals.subtotal()).isNull();
        assertThat(totals.total()).isNull();
        assertThat(totals.rows()).allSatisfy(r -> assertThat(r.amount()).isNull());
    }

    @Test
    void oneHorseHasNoVolumeBreakRow() {
        PricingInput one = air(ServiceClass.FIRST, sizeS(1));
        assertThat(row(QuotePricer.price(one, pnhHkgRates()), "VOLUME_BREAK")).isNull();
    }

    @Test
    void ownCoverHasNoInsuranceRow() {
        PricedQuote quote =
                QuotePricer.price(withInsurance(pnhHkgBusiness(), InsuranceOption.OWN_POLICY), pnhHkgRates());
        assertThat(row(quote, "INSURANCE")).isNull();
        assertThat(quote.totals().insurance()).isNull();
    }

    @Test
    void roadHasNoFuelRow() {
        PricingInput move =
                road(TrailerType.SHARED, 700, 0, List.of(horse("Lotus Crown", HorseSex.GELDING, "M", 32, "90000")));
        PricedQuote quote = QuotePricer.price(
                move, roadRates(kmLine("ROAD_SHARED", "Road freight, shared load", TrailerType.SHARED, "2.40", null)));
        assertThat(row(quote, "FUEL")).isNull();
        assertThat(quote.fit()).isNull();
        assertThat(quote.totals().total()).isNotNull();
    }

    @Test
    void roundingIsAppliedOncePerAmount() {
        PricedQuote quote = QuotePricer.price(pnhHkgBusiness(), pnhHkgRates());
        assertThat(quote.totals().contingency()).isEqualTo(d("1667.66"));
        assertThat(row(quote, "SERVICE_FEE").baseText()).endsWith("$35,020.91");
    }

    @Test
    void everyBasisTextFitsEightyCharacters() {
        List<PricingHorse> seven = IntStream.range(0, 7)
                .mapToObj(i -> horse("A twenty-letter name", HorseSex.MARE, "XL", 96, "300000"))
                .toList();
        String longCode = "AIR A-VERY-LONG-CORRIDOR-CODE-OF-FORTY";
        PricingInput in = new PricingInput(
                TransportMode.AIR,
                longCode,
                "Thành phố Hồ Chí Minh",
                "Hong Kong (Sha Tin)",
                "Hong Kong",
                1550,
                2,
                ServiceClass.BUSINESS,
                null,
                InsuranceOption.EQUIFREIGHT,
                true,
                30,
                seven);

        PricedQuote refused = QuotePricer.price(in, rates(List.of(), pnhHkgLines()));
        PricingInput first = new PricingInput(
                TransportMode.AIR,
                longCode,
                in.fromCity(),
                in.toCity(),
                "Hong Kong",
                1550,
                2,
                ServiceClass.FIRST,
                null,
                InsuranceOption.EQUIFREIGHT,
                true,
                30,
                seven);
        PricedQuote priced = QuotePricer.price(first, pnhHkgRates());

        for (PricedQuote quote : List.of(refused, priced)) {
            assertThat(quote.lines()).allSatisfy(l -> {
                assertThat(l.basisText().length()).as(l.basisText()).isLessThanOrEqualTo(80);
                assertThat(l.description().length()).as(l.description()).isLessThanOrEqualTo(160);
            });
        }
    }

    // --- review fixes ------------------------------------------------------------------------------------

    @Test
    void aColtIsPricedAtTheStallionRateAndAFillyAtTheMareRate() {
        PricingInput young = air(
                ServiceClass.BUSINESS,
                List.of(
                        horse("Young Thunder", HorseSex.COLT, "M", 32, "50000"),
                        horse("Little Star", HorseSex.FILLY, "M", 32, "50000")));

        PricedQuote quote = QuotePricer.price(young, pnhHkgRates());

        assertThat(quote.missing()).isEmpty();
        assertThat(findAll(quote, "Pre-export isolation"))
                .extracting(PricedLine::description, l -> l.amount().toPlainString())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("Pre-export isolation · stallion", "1960.00"),
                        org.assertj.core.groups.Tuple.tuple("Pre-export isolation · mare", "1190.00"));
    }

    @Test
    void longCitiesStillFitTheDescriptionColumn() {
        String city = "A city name of exactly eighty characters, which is the longest a city can be....";
        PricingInput in = new PricingInput(
                TransportMode.AIR,
                "AIR X",
                city,
                city,
                "Hong Kong",
                1550,
                0,
                ServiceClass.BUSINESS,
                null,
                InsuranceOption.EQUIFREIGHT,
                false,
                14,
                pnhHkgBusiness().horses());

        PricedQuote quote = QuotePricer.price(in, rates(List.of(), pnhHkgLines()));

        assertThat(quote.lines())
                .allSatisfy(l -> assertThat(l.description().length()).isLessThanOrEqualTo(160));
        assertThat(quote.missing())
                .allSatisfy(m -> assertThat(m.description().length()).isLessThanOrEqualTo(160));
    }
}
