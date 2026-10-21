package com.equifreight.service.pricing;

import static com.equifreight.service.pricing.PricingFixtures.air;
import static com.equifreight.service.pricing.PricingFixtures.d;
import static com.equifreight.service.pricing.PricingFixtures.horse;
import static com.equifreight.service.pricing.PricingFixtures.kmLine;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgBusiness;
import static com.equifreight.service.pricing.PricingFixtures.pnhHkgRates;
import static com.equifreight.service.pricing.PricingFixtures.rates;
import static com.equifreight.service.pricing.PricingFixtures.road;
import static org.assertj.core.api.Assertions.assertThat;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.service.quotation.QuotationSnapshot;
import com.equifreight.service.quotation.Snapshots;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** The issued snapshot: the stall sizing in words, and a lossless round trip through JSON. */
class SnapshotsTest {

    @Test
    void stallNoteForTwoBusinessHorses() {
        PricingInput in = pnhHkgBusiness();
        PricedQuote quote = QuotePricer.price(in, pnhHkgRates());

        assertThat(Snapshots.stallNote(in, pnhHkgRates(), quote))
                .isEqualTo("Nightfall and Shadowfax fly business class at 48 in each: 96 in, so 1 position. Flying"
                        + " grooms: 2 ÷ 3, rounded up, is 1. No flight vet: one joins from 8 horses, or when a horse"
                        + " is declared above $250,000.");
    }

    @Test
    void aQuotedFlightVetSaysWhy() {
        PricingInput in = air(
                ServiceClass.FIRST,
                List.of(
                        horse("Nightfall", HorseSex.MARE, "M", 32, "300000"),
                        horse("Shadowfax", HorseSex.GELDING, "M", 32, "150000"),
                        horse("Copper King", HorseSex.STALLION, "L", 48, "90000")));
        PricedQuote quote = QuotePricer.price(in, pnhHkgRates());

        assertThat(Snapshots.stallNote(in, pnhHkgRates(), quote))
                .isEqualTo("Nightfall, Shadowfax and Copper King fly first class at 96 in each: 288 in, so 3"
                        + " positions. Flying grooms: 3 ÷ 3, rounded up, is 1. A flight vet joins: a declared value"
                        + " above $250,000.00.");
    }

    @Test
    void aRoadQuoteHasNoStallNote() {
        PricingInput in =
                road(TrailerType.SHARED, 230, 0, List.of(horse("Shadowfax", HorseSex.GELDING, "M", 32, "150000")));
        RateSet rates = rates(List.of(), List.of(kmLine("ROAD", "Road freight", null, "2.40", "400")));

        assertThat(Snapshots.stallNote(in, rates, QuotePricer.price(in, rates))).isNull();
    }

    @Test
    void snapshotRoundTripsThroughJson() {
        Snapshots snapshots = new Snapshots(JsonMapper.builder().build());
        QuotationSnapshot snapshot = new QuotationSnapshot(
                List.of(new QuotationSnapshot.Row("CONTINGENCY", "Contingency", "5% of $33,353.25", d("1667.66"))),
                new QuotationSnapshot.Fit(1, 96),
                "Nightfall flies business class.",
                new QuotationSnapshot.Facts(
                        "Phnom Penh",
                        "Hong Kong",
                        com.equifreight.entity.enums.TransportMode.AIR,
                        null,
                        ServiceClass.BUSINESS,
                        List.of(new QuotationSnapshot.Horse(
                                java.util.UUID.randomUUID(), "Nightfall", HorseSex.MARE, "M", "BAY")),
                        LocalDate.of(2026, 11, 20),
                        (short) 3,
                        com.equifreight.entity.enums.ArrivalMode.ANY_TIME,
                        null,
                        null,
                        com.equifreight.entity.enums.InsuranceOption.EQUIFREIGHT,
                        false));

        assertThat(snapshots.read(snapshots.write(snapshot))).isEqualTo(snapshot);
    }
}
