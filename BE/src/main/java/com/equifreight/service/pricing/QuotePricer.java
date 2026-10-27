package com.equifreight.service.pricing;

import static com.equifreight.service.pricing.PricingText.classWord;
import static com.equifreight.service.pricing.PricingText.horses;
import static com.equifreight.service.pricing.PricingText.money;
import static com.equifreight.service.pricing.PricingText.pct;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

/**
 * Prices a quotation from one pinned rate set, in the fixed order of the quotation spec §4.4 (spec §4): expand the
 * catalog lines, measure the air stall, then the volume break, fuel, insurance, contingency and the service fee.
 * Every amount is rounded to cents once; percentages are taken of sums of rounded amounts.
 */
public final class QuotePricer {

    /** One air stall position is 96 inches wide. */
    public static final int POSITION_WIDTH_IN = 96;

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final Set<String> BREAK_GROUPS = Set.of("A", "C", "G");

    private QuotePricer() {}

    public static PricedQuote price(PricingInput in, RateSet rates) {
        List<PricedLine> lines = new ArrayList<>();
        StallFit fit = fit(in, rates);
        ClassRow classRow = in.mode() == TransportMode.AIR ? RequiredRates.classRow(rates, in.airClass()) : null;
        if (classRow != null && fit.refusal() == null) {
            lines.add(stallLine(in, classRow, fit));
        }
        for (RateRow row : rates.lines()) {
            expand(in, rates, row, lines);
        }
        for (RoadLeg leg : in.legs()) {
            RateRow freight = RequiredRates.legFreight(leg, in.legTrailer());
            if (freight != null && leg.distanceKm() != null) lines.add(legLine(in, leg, freight));
        }
        List<MissingRate> missing = RequiredRates.forRequest(in, rates);
        for (int i = 0; i < missing.size(); i++) {
            MissingRate gap = missing.get(i);
            if (gap.group() != null) {
                lines.add(new PricedLine(
                        gap.group(),
                        "MISSING:" + (i + 1),
                        gap.description(),
                        RateBasis.PER_SHIPMENT,
                        "No rate in the catalog",
                        BigDecimal.ONE,
                        null,
                        null,
                        LineSource.MANUAL,
                        null,
                        null,
                        null,
                        LineCertainty.FIXED,
                        null));
            }
        }
        lines.sort(Comparator.comparing(PricedLine::group));
        boolean complete = missing.isEmpty() && (fit == null || fit.refusal() == null);
        return new PricedQuote(List.copyOf(lines), missing, fit, totals(in, rates, lines, complete));
    }

    /**
     * The totals in the fixed order over lines the manager adjusted: overridden amounts in place and added lines
     * included. Over the engine's own lines it gives exactly {@link #price}'s totals.
     */
    public static PricedTotals retotal(PricingInput in, RateSet rates, List<PricedLine> lines) {
        StallFit fit = fit(in, rates);
        boolean complete = lines.stream().allMatch(l -> l.amount() != null)
                && RequiredRates.forRequest(in, rates).isEmpty()
                && (fit == null || fit.refusal() == null);
        return totals(in, rates, lines, complete);
    }

    /**
     * How the horses fit the priced air class; null for road, or when the class has no row in the catalog. The width
     * checks come first; then the weight (BR-Q-16): a horse with no weight when weights are required, the heaviest
     * horses that could share a stall against the stall payload, and the total against the air shipment limit. A
     * missing policy skips its check (it is listed as a missing rate). Weight never prices a line.
     */
    public static StallFit fit(PricingInput in, RateSet rates) {
        if (in.mode() != TransportMode.AIR) {
            return null;
        }
        ClassRow classRow = RequiredRates.classRow(rates, in.airClass());
        if (classRow == null) {
            return null;
        }
        int width = classRow.widthPerHorseIn();
        Integer weight = totalWeight(in.horses());
        for (PricingHorse horse : in.horses()) {
            String refusal = refusal(horse, in.airClass(), width);
            if (refusal != null) {
                List<ServiceClass> achievable = rates.classes().stream()
                        .filter(c -> in.horses().stream()
                                .allMatch(h -> refusal(h, c.serviceClass(), c.widthPerHorseIn()) == null))
                        .map(ClassRow::serviceClass)
                        .sorted()
                        .toList();
                return new StallFit(0, 0, refusal, achievable, weight);
            }
        }
        if (in.weightsRequired()) {
            for (PricingHorse horse : in.horses()) {
                if (horse.weightKg() == null) {
                    return new StallFit(
                            0,
                            0,
                            horse.name() + "'s weight isn't on the request, so the stall load can't be checked.",
                            List.of(),
                            weight);
                }
            }
        }
        BigDecimal payload = rates.policies().get(RatePolicyKey.STALL_PAYLOAD_KG);
        if (payload != null) {
            String load = stallLoad(in.horses(), width, payload);
            if (load != null) {
                List<ServiceClass> achievable = rates.classes().stream()
                        .filter(c -> in.horses().stream()
                                        .allMatch(h -> refusal(h, c.serviceClass(), c.widthPerHorseIn()) == null)
                                && stallLoad(in.horses(), c.widthPerHorseIn(), payload) == null)
                        .map(ClassRow::serviceClass)
                        .sorted()
                        .toList();
                return new StallFit(0, 0, load, achievable, weight);
            }
        }
        BigDecimal limit = rates.policies().get(RatePolicyKey.AIR_SHIPMENT_MAX_KG);
        int known = in.horses().stream()
                .map(PricingHorse::weightKg)
                .filter(w -> w != null)
                .mapToInt(Integer::intValue)
                .sum();
        if (limit != null && BigDecimal.valueOf(known).compareTo(limit) > 0) {
            return new StallFit(
                    0,
                    0,
                    "The horses weigh " + kg(known) + " kg; one air shipment carries " + kg(limit.intValue()) + " kg.",
                    List.of(),
                    weight);
        }
        int total = width * in.horses().size();
        int positions = (total + POSITION_WIDTH_IN - 1) / POSITION_WIDTH_IN;
        return new StallFit(positions, total, null, List.of(), weight);
    }

    /** The horses' total weight, or null while any weight is unknown. */
    private static Integer totalWeight(List<PricingHorse> horses) {
        int total = 0;
        for (PricingHorse horse : horses) {
            if (horse.weightKg() == null) {
                return null;
            }
            total += horse.weightKg();
        }
        return total;
    }

    /**
     * Whether the heaviest horses that could share one stall in a class of this width exceed the payload: a 96 in stall
     * takes 96 ÷ width horses, so they are what any load plan might put together. Unknown weights count as 0 kg. Null
     * when they fit.
     */
    private static String stallLoad(List<PricingHorse> horses, int classWidth, BigDecimal payload) {
        int perStall = Math.min(POSITION_WIDTH_IN / classWidth, horses.size());
        List<PricingHorse> heaviest = horses.stream()
                .filter(h -> h.weightKg() != null)
                .sorted(Comparator.comparing(PricingHorse::weightKg).reversed())
                .limit(perStall)
                .toList();
        int sum = heaviest.stream().mapToInt(PricingHorse::weightKg).sum();
        if (heaviest.isEmpty() || BigDecimal.valueOf(sum).compareTo(payload) <= 0) {
            return null;
        }
        String carries = "; a stall carries " + kg(payload.intValue()) + " kg.";
        return heaviest.size() == 1
                ? heaviest.getFirst().name() + " weighs " + kg(sum) + " kg" + carries
                : "The " + heaviest.size() + " heaviest horses that could share a stall weigh " + kg(sum) + " kg"
                        + carries;
    }

    private static String kg(int kilograms) {
        return String.format(Locale.US, "%,d", kilograms);
    }

    private static String refusal(PricingHorse horse, ServiceClass serviceClass, int classWidth) {
        if (horse.widthIn() == null) {
            return horse.name() + "'s size class " + horse.sizeClassCode()
                    + " is unknown, so the stall can't be measured.";
        }
        if (horse.withFoal() && classWidth < POSITION_WIDTH_IN) {
            return horse.name() + " travels with a foal and needs a full 96 in box; " + classWord(serviceClass)
                    + " gives " + classWidth + " in.";
        }
        if (horse.widthIn() > classWidth) {
            return horse.name() + " is size " + horse.sizeClassCode() + " (" + horse.widthIn() + " in); "
                    + classWord(serviceClass) + " gives " + classWidth + " in.";
        }
        return null;
    }

    private static PricedLine stallLine(PricingInput in, ClassRow classRow, StallFit fit) {
        int width = classRow.widthPerHorseIn();
        String basis = classWord(in.airClass()) + " gives each horse " + width + " in · "
                + in.horses().size() + " × "
                + width + " in = " + fit.widthUsedIn() + " in = " + fit.positions()
                + (fit.positions() == 1 ? " position" : " positions");
        BigDecimal quantity = BigDecimal.valueOf(fit.positions());
        return new PricedLine(
                "C",
                "STALL",
                PricingText.fitDescription(
                        "Air stall position " + in.fromCity() + " → " + in.toCity() + ", " + classWord(in.airClass())),
                RateBasis.PER_POSITION,
                basis,
                quantity,
                classRow.positionRate(),
                cents(classRow.positionRate().multiply(quantity)),
                LineSource.CATALOG,
                null,
                classRow.id(),
                null,
                LineCertainty.FIXED,
                null);
    }

    private static void expand(PricingInput in, RateSet rates, RateRow row, List<PricedLine> lines) {
        List<PricingHorse> matching = in.horses().stream()
                .filter(h -> row.appliesToSex() == null || RequiredRates.rateSex(h.sex()) == row.appliesToSex())
                .toList();
        int n = in.horses().size();
        switch (row.basis()) {
            case PER_HORSE -> {
                if (!matching.isEmpty()) {
                    lines.add(priced(row, "per horse · " + horses(matching.size()), matching.size(), one(matching)));
                }
            }
            case PER_SHIPMENT -> lines.add(priced(row, "per shipment", 1, null));
            case PER_KM -> {
                boolean trailerMatches = row.appliesToTrailer() == null || row.appliesToTrailer() == in.trailer();
                if (in.mode() == TransportMode.ROAD && trailerMatches && in.distanceKm() != null) {
                    lines.add(perKm(in, row));
                }
            }
            case PER_CROSSING -> {
                if (in.crossingCount() > 0) {
                    lines.add(priced(row, "per crossing · " + in.crossingCount(), in.crossingCount(), null));
                }
            }
            case PER_DAY -> perDay(in, row, matching, lines);
            case PER_HOUR -> {
                if (row.defaultQuantity() != null) {
                    BigDecimal hours = row.defaultQuantity();
                    lines.add(line(
                            row,
                            "per hour · " + hours.stripTrailingZeros().toPlainString() + " h estimated",
                            hours,
                            null,
                            LineCertainty.ESTIMATED));
                }
            }
            case PER_THREE_HORSES -> {
                int grooms = (n + 2) / 3;
                lines.add(priced(row, "one per three horses · " + n + " ÷ 3, rounded up = " + grooms, grooms, null));
            }
            case FLIGHT_VET -> {
                String trigger = flightVetTrigger(in, rates);
                if (trigger != null) {
                    lines.add(priced(row, trigger, 1, null));
                }
            }
            case PER_POSITION -> {
                // Stall positions are priced from the service class table, never from a line.
            }
        }
    }

    /**
     * A domestic leg to or from a hub (US-F1-09): its corridor's per-km road rate over its own distance, in the leg's
     * group (A before the border, G after), so the volume break and the arrival window count it as ground.
     */
    private static PricedLine legLine(PricingInput in, RoadLeg leg, RateRow row) {
        BigDecimal km = BigDecimal.valueOf(leg.distanceKm());
        BigDecimal amount = cents(row.rate().multiply(km));
        String basis = "per km · " + leg.distanceKm() + " km · " + leg.code();
        if (row.minCharge() != null && row.minCharge().compareTo(amount) > 0) {
            amount = cents(row.minCharge());
            basis += " · minimum charge applies";
        }
        return new PricedLine(
                leg.group(),
                "LEG_" + leg.group() + "_" + row.code(),
                PricingText.fitDescription("Road freight " + leg.fromCity() + " → " + leg.toCity() + ", "
                        + PricingText.trailerWord(in.legTrailer())),
                row.basis(),
                basis,
                km,
                row.rate(),
                amount,
                LineSource.CATALOG,
                row.id(),
                null,
                null,
                certainty(row),
                row.estimateNote());
    }

    private static PricedLine perKm(PricingInput in, RateRow row) {
        BigDecimal km = BigDecimal.valueOf(in.distanceKm());
        BigDecimal amount = cents(row.rate().multiply(km));
        String basis = "per km · " + in.distanceKm() + " km";
        if (row.minCharge() != null && row.minCharge().compareTo(amount) > 0) {
            amount = cents(row.minCharge());
            basis += " · minimum charge applies";
        }
        return new PricedLine(
                row.group(),
                row.code(),
                description(row),
                row.basis(),
                basis,
                km,
                row.rate(),
                amount,
                LineSource.CATALOG,
                row.id(),
                null,
                null,
                certainty(row),
                row.estimateNote());
    }

    private static void perDay(PricingInput in, RateRow row, List<PricingHorse> matching, List<PricedLine> lines) {
        Integer days = in.quarantineDays();
        if (days == null || days == 0 || matching.isEmpty()) {
            return;
        }
        int count = matching.size();
        String basis = row.appliesToSex() == null
                ? "per horse per day · " + count + " × " + days + " days"
                : "per day · " + days + " days × " + horses(count);
        lines.add(priced(row, basis, days * count, one(matching)));
    }

    /** The first rule that brings the flight vet, in words, or null when none does. */
    private static String flightVetTrigger(PricingInput in, RateSet rates) {
        BigDecimal minHorses = rates.policies().get(RatePolicyKey.FLIGHT_VET_MIN_HORSES);
        BigDecimal threshold = rates.policies().get(RatePolicyKey.HIGH_VALUE_THRESHOLD);
        if (minHorses != null && in.horses().size() >= minHorses.intValue()) {
            return minHorses.intValue() + " or more horses";
        }
        if (threshold != null
                && in.horses().stream().anyMatch(h -> h.declaredValue().compareTo(threshold) > 0)) {
            return "a declared value above " + money(threshold);
        }
        return in.vetEscort() ? "vet escort requested" : null;
    }

    private static UUID one(List<PricingHorse> horses) {
        return horses.size() == 1 ? horses.getFirst().horseId() : null;
    }

    private static PricedLine priced(RateRow row, String basis, int quantity, UUID horseId) {
        return line(row, basis, BigDecimal.valueOf(quantity), horseId, certainty(row));
    }

    private static PricedLine line(
            RateRow row, String basis, BigDecimal quantity, UUID horseId, LineCertainty certainty) {
        String key = row.basis() == RateBasis.PER_DAY && horseId != null ? row.code() + ":" + horseId : row.code();
        return new PricedLine(
                row.group(),
                key,
                description(row),
                row.basis(),
                basis,
                quantity,
                row.rate(),
                cents(row.rate().multiply(quantity)),
                LineSource.CATALOG,
                row.id(),
                null,
                horseId,
                certainty,
                certainty == LineCertainty.ESTIMATED ? row.estimateNote() : null);
    }

    private static String description(RateRow row) {
        HorseSex sex = row.appliesToSex();
        return PricingText.fitDescription(
                sex == null ? row.description() : row.description() + " · " + PricingText.sexWord(sex));
    }

    private static LineCertainty certainty(RateRow row) {
        return row.certainty() == RateCertainty.ESTIMATED ? LineCertainty.ESTIMATED : LineCertainty.FIXED;
    }

    private static PricedTotals totals(PricingInput in, RateSet rates, List<PricedLine> lines, boolean complete) {
        Map<String, BigDecimal> groups = groupSums(lines);
        BigDecimal priced = groups.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal breakBase = BREAK_GROUPS.stream()
                .map(g -> groups.getOrDefault(g, BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal air = in.mode() == TransportMode.AIR ? groups.getOrDefault("C", BigDecimal.ZERO) : BigDecimal.ZERO;
        BigDecimal declared =
                in.horses().stream().map(PricingHorse::declaredValue).reduce(BigDecimal.ZERO, BigDecimal::add);

        BreakRow band = rates.breaks().stream()
                .filter(b -> b.contains(in.horses().size()))
                .findFirst()
                .orElse(null);
        BigDecimal discount = band == null ? BigDecimal.ZERO : band.discountPct();
        BigDecimal fuelPct = in.mode() == TransportMode.AIR ? rates.policies().get(RatePolicyKey.FUEL_PCT) : null;
        BigDecimal insurancePct = in.insurance() == InsuranceOption.EQUIFREIGHT
                ? rates.policies().get(RatePolicyKey.INSURANCE_PCT)
                : null;
        BigDecimal contingencyPct = rates.policies().get(RatePolicyKey.CONTINGENCY_PCT);
        BigDecimal serviceFeePct = rates.policies().get(RatePolicyKey.SERVICE_FEE_PCT);
        BigDecimal windowPct = windowApplies(in) ? rates.policies().get(RatePolicyKey.ARRIVAL_WINDOW_PCT) : null;

        List<TotalRow> rows = new ArrayList<>();
        String freight = in.mode() == TransportMode.AIR ? "air" : "road";
        if (!complete) {
            if (discount.signum() > 0) {
                rows.add(new TotalRow(
                        "VOLUME_BREAK",
                        breakLabel(band),
                        pct(discount) + " of " + freight + " and ground lines (A, C, G)",
                        null));
            }
            if (windowPct != null) {
                rows.add(new TotalRow("ARRIVAL_WINDOW", "Arrival window", windowBase(windowPct), null));
            }
            if (fuelPct != null) {
                rows.add(new TotalRow(
                        "FUEL", "Fuel surcharge", pct(fuelPct) + " of air lines (C) after the volume break", null));
            }
            if (insurancePct != null) {
                rows.add(new TotalRow(
                        "INSURANCE",
                        "Transit insurance",
                        pct(insurancePct) + " of declared value · " + money(declared),
                        null));
            }
            if (contingencyPct != null) {
                rows.add(new TotalRow("CONTINGENCY", "Contingency", pct(contingencyPct) + " of the cost base", null));
            }
            if (serviceFeePct != null) {
                rows.add(new TotalRow("SERVICE_FEE", "Service fee", pct(serviceFeePct) + " after contingency", null));
            }
            return new PricedTotals(cents(priced), null, null, null, null, null, null, null, null, rows);
        }

        BigDecimal subtotal = cents(priced);
        BigDecimal volumeBreak = percent(breakBase, discount);
        if (volumeBreak.signum() > 0) {
            rows.add(new TotalRow(
                    "VOLUME_BREAK",
                    breakLabel(band),
                    pct(discount) + " of " + freight + " and ground lines (A, C, G) · " + money(breakBase),
                    volumeBreak));
        }
        BigDecimal arrivalWindow = null;
        if (windowPct != null) {
            BigDecimal groundAfterBreak = cents(breakBase.multiply(BigDecimal.ONE.subtract(discount.divide(HUNDRED))));
            arrivalWindow = percent(groundAfterBreak, windowPct);
            rows.add(new TotalRow(
                    "ARRIVAL_WINDOW",
                    "Arrival window",
                    windowBase(windowPct) + " · " + money(groundAfterBreak),
                    arrivalWindow));
        }
        BigDecimal fuel = null;
        if (fuelPct != null) {
            BigDecimal fuelBase = cents(air.multiply(BigDecimal.ONE.subtract(discount.divide(HUNDRED))));
            fuel = percent(fuelBase, fuelPct);
            rows.add(new TotalRow(
                    "FUEL",
                    "Fuel surcharge",
                    pct(fuelPct) + " of air lines (C) after the volume break · " + money(fuelBase),
                    fuel));
        }
        BigDecimal insurance = null;
        if (insurancePct != null) {
            insurance = percent(declared, insurancePct);
            rows.add(new TotalRow(
                    "INSURANCE",
                    "Transit insurance",
                    pct(insurancePct) + " of declared value · " + money(declared),
                    insurance));
        }
        BigDecimal costBase = subtotal.subtract(volumeBreak)
                .add(zero(arrivalWindow))
                .add(zero(fuel))
                .add(zero(insurance));
        BigDecimal contingency = percent(costBase, contingencyPct);
        rows.add(new TotalRow(
                "CONTINGENCY", "Contingency", pct(contingencyPct) + " of " + money(costBase), contingency));
        BigDecimal feeBase = costBase.add(contingency);
        BigDecimal serviceFee = percent(feeBase, serviceFeePct);
        rows.add(new TotalRow(
                "SERVICE_FEE",
                "Service fee",
                pct(serviceFeePct) + " after contingency · " + money(feeBase),
                serviceFee));
        BigDecimal total = feeBase.add(serviceFee);
        return new PricedTotals(
                subtotal,
                subtotal,
                volumeBreak.signum() > 0 ? volumeBreak : null,
                arrivalWindow,
                fuel,
                insurance,
                contingency,
                serviceFee,
                total,
                rows);
    }

    /** The arrival-window surcharge applies to a road move with a private trailer and a window (AGENTS.md). */
    public static boolean windowApplies(PricingInput in) {
        return in.mode() == TransportMode.ROAD && in.trailer() == TrailerType.PRIVATE && in.arrivalWindow();
    }

    private static String windowBase(BigDecimal windowPct) {
        return pct(windowPct) + " of ground lines (A, C, G) after the volume break";
    }

    private static String breakLabel(BreakRow band) {
        int min = band.minHorses();
        String count = band.maxHorses() == null
                ? min + "+ horses"
                : band.maxHorses() == min ? horses(min) : min + "–" + band.maxHorses() + " horses";
        return "Volume break, " + count;
    }

    private static BigDecimal percent(BigDecimal base, BigDecimal pct) {
        return cents(base.multiply(pct).divide(HUNDRED));
    }

    private static BigDecimal cents(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal zero(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    /** Group sums of the priced lines, A to H; a line without an amount adds nothing. */
    private static Map<String, BigDecimal> groupSums(List<PricedLine> lines) {
        Map<String, BigDecimal> sums = new TreeMap<>();
        for (PricedLine line : lines) {
            if (line.amount() != null) {
                sums.merge(line.group(), line.amount(), BigDecimal::add);
            }
        }
        return sums;
    }
}
