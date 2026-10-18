package com.equifreight.service.pricing;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Builders for the engine's inputs, shared by the pricing tests. */
final class PricingFixtures {

    private PricingFixtures() {}

    static BigDecimal d(String value) {
        return new BigDecimal(value);
    }

    static PricingHorse horse(String name, HorseSex sex, String size, int widthIn, String value) {
        return new PricingHorse(UUID.randomUUID(), name, sex, size, widthIn, false, d(value));
    }

    static PricingHorse foal(String name, String size, int widthIn, String value) {
        return new PricingHorse(UUID.randomUUID(), name, HorseSex.MARE, size, widthIn, true, d(value));
    }

    static RateRow line(String code, String group, String description, RateBasis basis, String rate) {
        return new RateRow(
                UUID.randomUUID(),
                code,
                group,
                description,
                basis,
                null,
                null,
                d(rate),
                null,
                null,
                RateCertainty.FIXED,
                null,
                false);
    }

    static RateRow sexLine(String code, String group, String description, HorseSex sex, String rate) {
        return new RateRow(
                UUID.randomUUID(),
                code,
                group,
                description,
                RateBasis.PER_DAY,
                sex,
                null,
                d(rate),
                null,
                null,
                RateCertainty.FIXED,
                null,
                false);
    }

    static RateRow kmLine(String code, String description, TrailerType trailer, String rate, String min) {
        return new RateRow(
                UUID.randomUUID(),
                code,
                "C",
                description,
                RateBasis.PER_KM,
                null,
                trailer,
                d(rate),
                min == null ? null : d(min),
                null,
                RateCertainty.FIXED,
                null,
                false);
    }

    static RateRow hourLine(String code, String group, String description, String rate, String hours, String note) {
        return new RateRow(
                UUID.randomUUID(),
                code,
                group,
                description,
                RateBasis.PER_HOUR,
                null,
                null,
                d(rate),
                null,
                d(hours),
                RateCertainty.ESTIMATED,
                note,
                false);
    }

    static ClassRow classRow(ServiceClass serviceClass, int width, String positionRate) {
        return new ClassRow(UUID.randomUUID(), serviceClass, width, d(positionRate));
    }

    static List<BreakRow> standardBreaks() {
        return List.of(
                new BreakRow(1, 1, d("0")),
                new BreakRow(2, 3, d("5")),
                new BreakRow(4, 7, d("10")),
                new BreakRow(8, null, d("15")));
    }

    static Map<RatePolicyKey, BigDecimal> standardPolicies() {
        Map<RatePolicyKey, BigDecimal> policies = new EnumMap<>(RatePolicyKey.class);
        policies.put(RatePolicyKey.FUEL_PCT, d("18"));
        policies.put(RatePolicyKey.INSURANCE_PCT, d("1.5"));
        policies.put(RatePolicyKey.CONTINGENCY_PCT, d("5"));
        policies.put(RatePolicyKey.SERVICE_FEE_PCT, d("12"));
        policies.put(RatePolicyKey.FLIGHT_VET_MIN_HORSES, d("8"));
        policies.put(RatePolicyKey.HIGH_VALUE_THRESHOLD, d("250000"));
        return policies;
    }

    /** The plan's PNH → HKG rate set, v2. */
    static List<RateRow> pnhHkgLines() {
        List<RateRow> lines = new ArrayList<>();
        lines.add(line("TRANSFER_ORIGIN", "A", "Road transfer to the cargo terminal", RateBasis.PER_SHIPMENT, "250"));
        lines.add(line("LOADING", "A", "Loading and handling at origin", RateBasis.PER_HORSE, "120"));
        lines.add(sexLine("ISO_STALLION", "B", "Pre-export isolation", HorseSex.STALLION, "140"));
        lines.add(sexLine("ISO_MARE", "B", "Pre-export isolation", HorseSex.MARE, "85"));
        lines.add(sexLine("ISO_GELDING", "B", "Pre-export isolation", HorseSex.GELDING, "70"));
        lines.add(line("VET_BLOODS", "B", "Veterinary inspection and bloods", RateBasis.PER_HORSE, "310"));
        lines.add(line("HANDLING", "C", "Airline handling and stall build-up", RateBasis.PER_SHIPMENT, "950"));
        lines.add(line("GROOM", "D", "Flying groom", RateBasis.PER_THREE_HORSES, "1450"));
        lines.add(line("FLIGHT_VET", "D", "Flight veterinarian", RateBasis.FLIGHT_VET, "2200"));
        lines.add(line("HEALTH_CERT", "E", "Export health certificate", RateBasis.PER_HORSE, "180"));
        lines.add(line("IMPORT_PERMIT", "E", "Hong Kong import permit handling", RateBasis.PER_SHIPMENT, "380"));
        lines.add(line("CROSSING", "E", "Customs and border documentation", RateBasis.PER_CROSSING, "420"));
        lines.add(line("POST_ISO", "F", "Post-arrival isolation, Sha Tin", RateBasis.PER_DAY, "95"));
        lines.add(line("TRANSFER_DEST", "G", "Road transfer to Sha Tin", RateBasis.PER_SHIPMENT, "300"));
        lines.add(hourLine(
                "WAITING",
                "H",
                "Waiting time at the cargo terminal",
                "95",
                "2",
                "Billed by the hour if the flight or border queue runs late."));
        return lines;
    }

    static RateSet rates(List<ClassRow> classes, List<RateRow> lines) {
        return new RateSet(2, classes, lines, standardBreaks(), standardPolicies());
    }

    static RateSet pnhHkgRates() {
        return rates(
                List.of(
                        classRow(ServiceClass.ECONOMY, 32, "16800"),
                        classRow(ServiceClass.BUSINESS, 48, "16800"),
                        classRow(ServiceClass.FIRST, 96, "16800")),
                pnhHkgLines());
    }

    static PricingInput air(ServiceClass airClass, List<PricingHorse> horses) {
        return new PricingInput(
                TransportMode.AIR,
                "AIR PNH → HKG",
                "Phnom Penh",
                "Hong Kong",
                "Hong Kong",
                1550,
                0,
                airClass,
                null,
                InsuranceOption.EQUIFREIGHT,
                false,
                14,
                horses);
    }

    static PricingInput pnhHkgBusiness() {
        return air(
                ServiceClass.BUSINESS,
                List.of(
                        horse("Nightfall", HorseSex.MARE, "M", 32, "175000"),
                        horse("Shadowfax", HorseSex.GELDING, "M", 32, "150000")));
    }

    static PricingInput road(TrailerType trailer, int km, int crossings, List<PricingHorse> horses) {
        return new PricingInput(
                TransportMode.ROAD,
                "RD HAN → VTE",
                "Hanoi",
                "Vientiane",
                "Laos",
                km,
                crossings,
                null,
                trailer,
                InsuranceOption.OWN_POLICY,
                false,
                7,
                horses);
    }
}
