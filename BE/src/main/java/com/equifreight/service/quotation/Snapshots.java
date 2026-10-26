package com.equifreight.service.quotation;

import static com.equifreight.service.pricing.PricingText.classWord;

import com.equifreight.entity.Corridor;
import com.equifreight.entity.Place;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.service.pricing.PricedLine;
import com.equifreight.service.pricing.PricedQuote;
import com.equifreight.service.pricing.PricedTotals;
import com.equifreight.service.pricing.PricingHorse;
import com.equifreight.service.pricing.PricingInput;
import com.equifreight.service.pricing.RateSet;
import com.equifreight.service.pricing.StallFit;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** Builds an issued quotation's snapshot, and writes and reads it as JSON. */
@Component
public class Snapshots {

    private final JsonMapper json;

    public Snapshots(JsonMapper json) {
        this.json = json;
    }

    public String write(QuotationSnapshot snapshot) {
        return json.writeValueAsString(snapshot);
    }

    public QuotationSnapshot read(String stored) {
        return json.readValue(stored, QuotationSnapshot.class);
    }

    /**
     * The quotation's snapshot; one issued before snapshots existed (or written by a seeder) gets one made from its
     * stored totals and the request, with the totals' labels but no bases, and no stall note.
     */
    public QuotationSnapshot of(Quotation q, TransportRequest request) {
        return q.getIssuedSnapshot() != null ? read(q.getIssuedSnapshot()) : fromStoredTotals(q, request);
    }

    static QuotationSnapshot fromStoredTotals(Quotation q, TransportRequest request) {
        List<QuotationSnapshot.Row> rows = new ArrayList<>();
        row(rows, "VOLUME_BREAK", "Volume break", q.getVolumeBreak());
        row(rows, "ARRIVAL_WINDOW", "Arrival window", q.getArrivalWindowSurcharge());
        row(rows, "FUEL", "Fuel surcharge", q.getFuel());
        row(rows, "INSURANCE", "Transit insurance", q.getInsurance());
        row(rows, "CONTINGENCY", "Contingency", q.getContingency());
        row(rows, "SERVICE_FEE", "Service fee", q.getServiceFee());
        Corridor corridor = request.getCorridor();
        List<QuotationSnapshot.Horse> horses = request.getHorses().stream()
                .map(rh -> new QuotationSnapshot.Horse(
                        rh.getHorse().getId(),
                        rh.getHorse().getName(),
                        rh.getSex(),
                        rh.getSizeClassCode(),
                        rh.getHorse().getCoat() == null
                                ? null
                                : rh.getHorse().getCoat().name()))
                .toList();
        QuotationSnapshot.Facts facts = new QuotationSnapshot.Facts(
                city(request.getOriginPlace(), corridor == null ? null : corridor.getOriginCity()),
                city(request.getDestinationPlace(), corridor == null ? null : corridor.getDestinationCity()),
                request.getMode(),
                request.getTrailer(),
                q.getAirClass() != null ? q.getAirClass() : request.getAirClass(),
                horses,
                request.getDepartureDate(),
                request.getDateFlexDays(),
                request.getArrivalMode(),
                request.getWindowStart(),
                request.getWindowEnd(),
                request.getInsurance(),
                request.isVetEscort());
        return new QuotationSnapshot(List.copyOf(rows), null, null, facts);
    }

    private static void row(List<QuotationSnapshot.Row> rows, String key, String label, BigDecimal amount) {
        if (amount != null) {
            rows.add(new QuotationSnapshot.Row(key, label, "", amount));
        }
    }

    private static String city(Place place, String fallback) {
        return place == null ? fallback : place.getCity();
    }

    /**
     * The snapshot of a quotation about to be issued, from the same engine run its issue check used.
     *
     * @param totals the totals over the adjusted lines (the overrides and added lines applied)
     */
    public static QuotationSnapshot of(
            TransportRequest request, PricingInput in, RateSet rates, PricedQuote quote, PricedTotals totals) {
        List<QuotationSnapshot.Row> rows = totals.rows().stream()
                .map(r -> new QuotationSnapshot.Row(r.key(), r.label(), r.baseText(), r.amount()))
                .toList();
        StallFit fit = quote.fit();
        Map<UUID, RequestHorse> stored = request.getHorses().stream()
                .collect(Collectors.toMap(rh -> rh.getHorse().getId(), Function.identity(), (a, b) -> a));
        List<QuotationSnapshot.Horse> horses = in.horses().stream()
                .map(h -> {
                    RequestHorse rh = stored.get(h.horseId());
                    String coat = rh == null || rh.getHorse().getCoat() == null
                            ? null
                            : rh.getHorse().getCoat().name();
                    return new QuotationSnapshot.Horse(h.horseId(), h.name(), h.sex(), h.sizeClassCode(), coat);
                })
                .toList();
        QuotationSnapshot.Facts facts = new QuotationSnapshot.Facts(
                in.fromCity(),
                in.toCity(),
                in.mode(),
                in.trailer(),
                in.airClass(),
                horses,
                request.getDepartureDate(),
                request.getDateFlexDays(),
                request.getArrivalMode(),
                request.getWindowStart(),
                request.getWindowEnd(),
                in.insurance(),
                in.vetEscort());
        return new QuotationSnapshot(
                rows,
                fit == null || fit.refusal() != null
                        ? null
                        : new QuotationSnapshot.Fit(fit.positions(), fit.widthUsedIn(), fit.totalWeightKg()),
                stallNote(in, rates, quote),
                facts);
    }

    /**
     * How the air stall was sized, in the customer's words: "Nightfall and Shadowfax fly business class at 48 in each:
     * 96 in, so 1 position. Flying grooms: 2 ÷ 3, rounded up, is 1. No flight vet: …". Null on road, or when the
     * class doesn't fit.
     */
    public static String stallNote(PricingInput in, RateSet rates, PricedQuote quote) {
        StallFit fit = quote.fit();
        if (in.mode() != TransportMode.AIR
                || fit == null
                || fit.refusal() != null
                || in.horses().isEmpty()) {
            return null;
        }
        int n = in.horses().size();
        StringBuilder note = new StringBuilder()
                .append(names(in.horses()))
                .append(n == 1 ? " flies " : " fly ")
                .append(classWord(in.airClass()))
                .append(" class at ")
                .append(fit.widthUsedIn() / n)
                .append(" in each: ")
                .append(fit.widthUsedIn())
                .append(" in, so ")
                .append(fit.positions())
                .append(fit.positions() == 1 ? " position." : " positions.");
        quote.lines().stream()
                .filter(l -> l.basis() == RateBasis.PER_THREE_HORSES && l.quantity() != null)
                .findFirst()
                .ifPresent(groom -> note.append(' ')
                        .append(groom.description())
                        .append("s: ")
                        .append(n)
                        .append(" ÷ 3, rounded up, is ")
                        .append(groom.quantity().intValue())
                        .append('.'));
        boolean catalogHasVet = rates.lines().stream().anyMatch(r -> r.basis() == RateBasis.FLIGHT_VET);
        PricedLine vet = quote.lines().stream()
                .filter(l -> l.basis() == RateBasis.FLIGHT_VET)
                .findFirst()
                .orElse(null);
        BigDecimal minHorses = rates.policies().get(RatePolicyKey.FLIGHT_VET_MIN_HORSES);
        BigDecimal threshold = rates.policies().get(RatePolicyKey.HIGH_VALUE_THRESHOLD);
        if (vet != null) {
            note.append(" A flight vet joins: ").append(vet.basisText()).append('.');
        } else if (catalogHasVet && minHorses != null && threshold != null) {
            note.append(" No flight vet: one joins from ")
                    .append(minHorses.intValue())
                    .append(" horses, or when a horse is declared above ")
                    .append(wholeDollars(threshold))
                    .append('.');
        }
        return note.toString();
    }

    /** "Nightfall", "Nightfall and Shadowfax", "Nightfall, Shadowfax and Copper King". */
    private static String names(List<PricingHorse> horses) {
        List<String> names = horses.stream().map(PricingHorse::name).toList();
        if (names.size() == 1) {
            return names.getFirst();
        }
        return String.join(", ", names.subList(0, names.size() - 1)) + " and " + names.getLast();
    }

    private static String wholeDollars(BigDecimal amount) {
        return "$" + new DecimalFormat("#,##0", DecimalFormatSymbols.getInstance(Locale.US)).format(amount);
    }
}
