package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.RateCatalogVersion;
import com.equifreight.entity.RateLine;
import com.equifreight.entity.RateServiceClass;
import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RatePolicyKey;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.quotation.QuotationDraftResponse;
import com.equifreight.model.quotation.QuotationMapper;
import com.equifreight.repository.QuotationRepository;
import com.equifreight.repository.RateCatalogVersionRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.pricing.CatalogRows;
import com.equifreight.service.pricing.PricedLine;
import com.equifreight.service.pricing.PricedQuote;
import com.equifreight.service.pricing.PricedTotals;
import com.equifreight.service.pricing.PricingInput;
import com.equifreight.service.pricing.PricingInputs;
import com.equifreight.service.pricing.QuotePricer;
import com.equifreight.service.pricing.RateSet;
import com.equifreight.service.pricing.RateSetLoader;
import com.equifreight.service.quotation.Snapshots;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Prices a draft quotation and answers it, for the draft and issue services alike. The manager's adjustments (an
 * override, an added line) are carried by line key across every price, and the totals are always worked out over the
 * adjusted lines (spec §4.2), so the total is never typed.
 */
@Component
public class QuotationPricing {

    private final Clock clock;
    private final RateSetLoader loader;
    private final PricingInputs inputs;
    private final RateCatalogVersionRepository versions;
    private final UserRepository users;

    private final QuotationRepository quotations;
    private final Snapshots snapshots;

    public QuotationPricing(
            RateSetLoader loader,
            PricingInputs inputs,
            RateCatalogVersionRepository versions,
            UserRepository users,
            QuotationRepository quotations,
            Snapshots snapshots,
            Clock clock) {
        this.clock = clock;
        this.loader = loader;
        this.inputs = inputs;
        this.versions = versions;
        this.users = users;
        this.quotations = quotations;
        this.snapshots = snapshots;
    }

    /**
     * Replaces the draft's lines and totals with the engine's answer on its pinned version, carrying the manager's
     * overrides and added lines by key.
     *
     * @return the overrides that could not be carried, in words ("Flight veterinarian: the line is no longer quoted")
     */
    public List<String> price(Quotation q, TransportRequest request) {
        q.setAirClass(pricedClass(q, request));
        CatalogRows rows = loader.load(q.getRateCatalogVersion().getId());
        RateSet rates = rows.forCorridor(request.getCorridor().getId());
        PricingInput in = inputs.inputFor(request, q.getAirClass(), true, rows);
        PricedQuote priced = QuotePricer.price(in, rates);

        Map<String, QuotationLine> overrides = new LinkedHashMap<>();
        List<QuotationLine> manual = new ArrayList<>();
        for (QuotationLine old : q.getLines()) {
            if (old.getManualReason() != null) {
                manual.add(old);
            } else if (old.getOverrideAmount() != null && QuotationMapper.keyOf(old) != null) {
                overrides.put(QuotationMapper.keyOf(old), old);
            }
        }

        Map<UUID, RateLine> rateLines =
                rows.lines().stream().collect(Collectors.toMap(RateLine::getId, Function.identity()));
        Map<UUID, RateServiceClass> stalls =
                rows.classes().stream().collect(Collectors.toMap(RateServiceClass::getId, Function.identity()));
        Map<UUID, RequestHorse> horses = request.getHorses().stream()
                .collect(Collectors.toMap(rh -> rh.getHorse().getId(), Function.identity(), (a, b) -> a));
        Map<String, Short> positions = new HashMap<>();
        List<String> dropped = new ArrayList<>();

        List<QuotationLine> fresh = new ArrayList<>();
        for (PricedLine p : priced.lines()) {
            QuotationLine line = new QuotationLine();
            line.setQuotation(q);
            line.setGroupCode(p.group());
            line.setPosition(positions.merge(p.group(), (short) 1, (a, b) -> (short) (a + b)));
            line.setLineKey(p.lineKey());
            line.setDescription(p.description());
            line.setBasisText(p.basisText());
            line.setBasis(p.basis());
            line.setQuantity(p.quantity());
            line.setUnitRate(p.unitRate());
            line.setSource(p.source());
            line.setRateLine(p.rateLineId() == null ? null : rateLines.get(p.rateLineId()));
            line.setRateServiceClass(p.rateServiceClassId() == null ? null : stalls.get(p.rateServiceClassId()));
            RequestHorse horse = p.horseId() == null ? null : horses.get(p.horseId());
            line.setHorse(horse == null ? null : horse.getHorse());
            line.setCertainty(p.certainty());
            line.setEstimateNote(p.estimateNote());
            line.setCatalogAmount(p.amount());
            QuotationLine carried = overrides.remove(p.lineKey());
            if (carried != null) {
                if (p.amount() == null) {
                    dropped.add(carried.getDescription() + ": the line has no rate now");
                } else {
                    line.setOverrideAmount(carried.getOverrideAmount());
                    line.setOverrideReason(carried.getOverrideReason());
                }
            }
            fresh.add(line);
        }
        overrides.values().forEach(o -> dropped.add(o.getDescription() + ": the line is no longer quoted"));
        for (QuotationLine m : manual) {
            QuotationLine line = copyManual(m, q);
            line.setPosition(positions.merge(m.getGroupCode(), (short) 1, (a, b) -> (short) (a + b)));
            fresh.add(line);
        }

        q.getLines().clear();
        q.getLines().addAll(fresh);
        store(q, QuotePricer.retotal(in, rates, adjusted(priced.lines(), fresh)));
        return dropped;
    }

    /**
     * Totals the draft again over its stored lines as they stand (an override or an added line changed), without
     * pricing the lines again.
     */
    public void retotal(Quotation q, TransportRequest request) {
        CatalogRows rows = loader.load(q.getRateCatalogVersion().getId());
        RateSet rates = rows.forCorridor(request.getCorridor().getId());
        PricingInput in = inputs.inputFor(request, pricedClass(q, request), true, rows);
        List<PricedLine> stored = q.getLines().stream()
                .sorted(java.util.Comparator.comparing(QuotationLine::getGroupCode)
                        .thenComparing(QuotationLine::getPosition))
                .map(QuotationPricing::asPriced)
                .toList();
        store(q, QuotePricer.retotal(in, rates, stored));
    }

    /**
     * The quotation's totals worked out again in their fixed order with some lines at a new amount: the final
     * invoice's actual quantities (US-F6-03). The rates are the quotation's pinned catalog; nothing is stored.
     */
    public PricedTotals totalsWith(Quotation q, TransportRequest request, java.util.Map<UUID, BigDecimal> amounts) {
        CatalogRows rows = loader.load(q.getRateCatalogVersion().getId());
        RateSet rates = rows.forCorridor(request.getCorridor().getId());
        // An accepted quotation may predate the weight check (no limits in its pinned version, no snapshot weights).
        PricingInput in = inputs.inputFor(request, pricedClass(q, request), false, rows);
        List<PricedLine> lines = q.getLines().stream()
                .sorted(java.util.Comparator.comparing(QuotationLine::getGroupCode)
                        .thenComparing(QuotationLine::getPosition))
                .map(l ->
                        amounts.containsKey(l.getId()) ? withAmount(asPriced(l), amounts.get(l.getId())) : asPriced(l))
                .toList();
        // The accepted lines are fixed, so a rate rule added since can't leave the invoice without its totals.
        return QuotePricer.retotal(in, rates, lines, false);
    }

    /** The draft's answer, with the overrides a write could not carry. */
    public QuotationDraftResponse toResponse(Quotation q, TransportRequest request, List<String> dropped) {
        Integer latest = versions.findFirstByStatusOrderByVersionNoDesc(CatalogStatus.PUBLISHED)
                .map(RateCatalogVersion::getVersionNo)
                .orElse(null);
        QuotationDraftResponse answer = q.getStatus() == QuotationStatus.DRAFT
                ? draftResponse(q, request, latest, dropped)
                : QuotationMapper.toIssuedResponse(q, request, snapshots.of(q, request), latest, catalogOwner());
        List<Quotation> all = quotations.findByRequestIdOrderByVersionNoDesc(request.getId());
        Quotation previous = all.stream()
                .filter(v -> v.getVersionNo() < q.getVersionNo() && v.getStatus() != QuotationStatus.DRAFT)
                .findFirst()
                .orElse(null);
        return answer.toBuilder()
                .versions(all.stream().map(QuotationMapper::toVersion).toList())
                .previous(previous == null ? null : QuotationMapper.toPrevious(previous))
                .build();
    }

    private QuotationDraftResponse draftResponse(
            Quotation q, TransportRequest request, Integer latest, List<String> dropped) {
        Evaluation e = evaluate(q, request);
        BigDecimal validity = e.rates().policies().get(RatePolicyKey.QUOTE_VALIDITY_DAYS);
        return QuotationMapper.toDraftResponse(
                q,
                request,
                e.input().airClass(),
                e.now(),
                e.expected(),
                latest,
                validity == null ? null : validity.intValue(),
                catalogOwner(),
                e.blockers(),
                dropped);
    }

    /**
     * The engine's answer for the request as it is now, on the draft's pinned version, against what is stored.
     *
     * @param expected the totals over {@code now}'s lines with the stored overrides and added lines applied
     * @param blockers what stops the draft being issued, in words, in the order of spec §5.3; empty when ready
     */
    public record Evaluation(
            PricingInput input,
            RateSet rates,
            PricedQuote now,
            PricedTotals expected,
            boolean repriceNeeded,
            List<String> blockers) {}

    public Evaluation evaluate(Quotation q, TransportRequest request) {
        CatalogRows rows = loader.load(q.getRateCatalogVersion().getId());
        RateSet rates = rows.forCorridor(request.getCorridor().getId());
        PricingInput in = inputs.inputFor(request, pricedClass(q, request), true, rows);
        PricedQuote now = QuotePricer.price(in, rates);
        PricedTotals expected = QuotePricer.retotal(in, rates, adjusted(now.lines(), q.getLines()));
        boolean stale = QuotationMapper.repriceNeeded(q, now, expected);

        List<String> blockers = new ArrayList<>();
        int missing = now.missing().size();
        if (missing > 0) {
            blockers.add((missing == 1 ? "1 rate is missing" : missing + " rates are missing") + " on " + in.fromCity()
                    + " → " + in.toCity() + ".");
        }
        if (now.fit() != null && now.fit().refusal() != null) {
            blockers.add(now.fit().refusal());
        }
        if (stale) {
            blockers.add("The request changed since this was priced. Re-price it first.");
        }
        LocalDate departure = request.getDepartureDate();
        if (departure != null && !departure.isAfter(LocalDate.now(clock.withZone(BusinessTime.ZONE)))) {
            blockers.add("The departure on " + BusinessTime.DAY.format(departure)
                    + " has come. Return the request to the customer for a new date.");
        }
        int versionNo = q.getRateCatalogVersion().getVersionNo();
        if (rates.policies().get(RatePolicyKey.QUOTE_VALIDITY_DAYS) == null) {
            blockers.add("Rate catalog v" + versionNo + " has no quote validity.");
        }
        if (rates.policies().get(RatePolicyKey.DEPOSIT_PCT) == null) {
            blockers.add("Rate catalog v" + versionNo + " has no deposit percentage.");
        }
        return new Evaluation(in, rates, now, expected, stale, List.copyOf(blockers));
    }

    /** The display name of the transport specialist who keeps the rate catalog, or null. */
    public String catalogOwner() {
        return users.findByRoleAndStatus(RoleName.TRANSPORT_SPECIALIST, UserStatus.ACTIVE).stream()
                .findFirst()
                .map(User::displayName)
                .orElse(null);
    }

    /**
     * The class to price with: none for a road move; for air, the class the manager chose, else the customer's.
     * The request's mode can change while it is back with the customer, so this follows the request as it is now.
     */
    static ServiceClass pricedClass(Quotation q, TransportRequest request) {
        if (request.getMode() != TransportMode.AIR) {
            return null;
        }
        return q.getAirClass() != null ? q.getAirClass() : request.getAirClass();
    }

    /**
     * The engine's lines with the stored adjustments applied: an override amount in place of the catalog amount
     * (only where the engine priced the line), and every added line.
     */
    static List<PricedLine> adjusted(List<PricedLine> engine, List<QuotationLine> stored) {
        Map<String, BigDecimal> overrides = new HashMap<>();
        List<PricedLine> result = new ArrayList<>();
        for (QuotationLine s : stored) {
            if (s.getManualReason() != null) {
                continue;
            }
            if (s.getOverrideAmount() != null && QuotationMapper.keyOf(s) != null) {
                overrides.put(QuotationMapper.keyOf(s), s.getOverrideAmount());
            }
        }
        for (PricedLine p : engine) {
            BigDecimal override = p.amount() == null ? null : overrides.get(p.lineKey());
            result.add(override == null ? p : withAmount(p, override));
        }
        for (QuotationLine s : stored) {
            if (s.getManualReason() != null) {
                result.add(asPriced(s));
            }
        }
        return result;
    }

    /** A stored line as the engine sees it, at its override amount when it has one. */
    private static PricedLine asPriced(QuotationLine s) {
        return new PricedLine(
                s.getGroupCode(),
                s.getLineKey(),
                s.getDescription(),
                s.getBasis(),
                s.getBasisText(),
                s.getQuantity(),
                s.getUnitRate(),
                s.getOverrideAmount() != null ? s.getOverrideAmount() : s.getCatalogAmount(),
                s.getSource(),
                null,
                null,
                null,
                s.getCertainty(),
                s.getEstimateNote());
    }

    private static PricedLine withAmount(PricedLine p, BigDecimal amount) {
        return new PricedLine(
                p.group(),
                p.lineKey(),
                p.description(),
                p.basis(),
                p.basisText(),
                p.quantity(),
                p.unitRate(),
                amount,
                p.source(),
                p.rateLineId(),
                p.rateServiceClassId(),
                p.horseId(),
                p.certainty(),
                p.estimateNote());
    }

    private static QuotationLine copyManual(QuotationLine m, Quotation q) {
        QuotationLine line = new QuotationLine();
        line.setQuotation(q);
        line.setGroupCode(m.getGroupCode());
        line.setLineKey(m.getLineKey());
        line.setDescription(m.getDescription());
        line.setBasisText(m.getBasisText());
        line.setBasis(m.getBasis());
        line.setQuantity(m.getQuantity());
        line.setUnitRate(m.getUnitRate());
        line.setSource(m.getSource());
        line.setCertainty(m.getCertainty());
        line.setEstimateNote(m.getEstimateNote());
        line.setCatalogAmount(m.getCatalogAmount());
        line.setManualReason(m.getManualReason());
        return line;
    }

    /** The most a money column holds (numeric(14, 2)): a line amount, a total, every figure on a quotation. */
    public static final BigDecimal MAX_AMOUNT = new BigDecimal("999999999999.99");

    /** "1,234.50": an amount as the too-large refusals state it. */
    static String amountText(BigDecimal amount) {
        return String.format(java.util.Locale.US, "%,.2f", amount);
    }

    private static void store(Quotation q, PricedTotals totals) {
        // A figure too large to store is the manager's typing, not a conflict: say so before the database refuses it.
        java.util.stream.Stream.of(
                        totals.subtotal(),
                        totals.fuel(),
                        totals.insurance(),
                        totals.contingency(),
                        totals.serviceFee(),
                        totals.total())
                .filter(java.util.Objects::nonNull)
                .max(java.util.Comparator.naturalOrder())
                .filter(largest -> largest.compareTo(MAX_AMOUNT) > 0)
                .ifPresent(largest -> {
                    throw new BusinessException(
                            "AMOUNT_TOO_LARGE",
                            "The quotation total would come to " + amountText(largest) + "; a quotation holds at most "
                                    + amountText(MAX_AMOUNT) + ". Check the amounts.");
                });
        q.setSubtotal(totals.subtotal());
        q.setVolumeBreak(totals.volumeBreak());
        q.setArrivalWindowSurcharge(totals.arrivalWindow());
        q.setFuel(totals.fuel());
        q.setInsurance(totals.insurance());
        q.setContingency(totals.contingency());
        q.setServiceFee(totals.serviceFee());
        q.setTotal(totals.total());
    }
}
