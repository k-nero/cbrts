package com.equifreight.model.quotation;

import com.equifreight.entity.Place;
import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.rate.RateMapper;
import com.equifreight.service.pricing.PricedLine;
import com.equifreight.service.pricing.PricedQuote;
import com.equifreight.service.pricing.PricedTotals;
import com.equifreight.service.pricing.PricingText;
import com.equifreight.service.pricing.StallFit;
import com.equifreight.service.quotation.QuotationSnapshot;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** A draft quotation to the Quotation builder's response. */
public final class QuotationMapper {

    private QuotationMapper() {}

    public static QuotationRefResponse toRef(Quotation q) {
        return new QuotationRefResponse(q.getCode(), q.getVersionNo(), q.getStatus());
    }

    /**
     * @param now the engine's answer for the request as it is now, on the pinned version: it gives the fit, the
     *     missing rates and the totals' wording, and tells whether the stored lines are out of date
     * @param expected the totals over {@code now}'s lines with the stored overrides and added lines applied: what the
     *     stored totals should be, and the rows' wording
     * @param droppedOverrides the overrides the write that answers could not carry, in words
     */
    public static QuotationDraftResponse toDraftResponse(
            Quotation q,
            TransportRequest request,
            ServiceClass airClass,
            PricedQuote now,
            PricedTotals expected,
            Integer latestPublishedVersionNo,
            Integer validityDays,
            String catalogOwner,
            List<String> blockers,
            List<String> droppedOverrides) {
        List<QuotationLine> lines = q.getLines().stream()
                .sorted(Comparator.comparing(QuotationLine::getGroupCode).thenComparing(QuotationLine::getPosition))
                .toList();
        TransportMode mode = request.getCorridor().getMode();
        boolean repriceNeeded = repriceNeeded(q, now, expected);
        int priced = (int) lines.stream().filter(l -> amount(l) != null).count();
        BigDecimal pricedSum = lines.stream()
                .map(QuotationMapper::amount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return QuotationDraftResponse.builder()
                .id(q.getId())
                .code(q.getCode())
                .versionNo(q.getVersionNo())
                .status(q.getStatus())
                .pinnedVersion(new PinnedVersionResponse(
                        q.getRateCatalogVersion().getId(),
                        q.getRateCatalogVersion().getVersionNo()))
                .latestPublishedVersionNo(latestPublishedVersionNo)
                .request(toFacts(request))
                .airClass(airClass)
                .fit(toFit(now.fit()))
                .groups(toGroups(lines, mode))
                .totals(QuoteTotalsResponse.builder()
                        .pricedLines(pricedSum)
                        .subtotal(q.getSubtotal())
                        // A stale draft shows the rows' wording but not amounts that disagree with its total.
                        .rows(expected.rows().stream()
                                .map(r -> new QuoteTotalRowResponse(
                                        r.key(), r.label(), r.baseText(), repriceNeeded ? null : r.amount()))
                                .toList())
                        .total(q.getTotal())
                        .build())
                .missing(now.missing().stream()
                        .map(RateMapper::toMissingResponse)
                        .toList())
                .readiness(new ReadinessResponse(
                        q.getTotal() != null && blockers.isEmpty(), priced, lines.size(), blockers))
                .validityDays(validityDays)
                .currency(q.getCurrency())
                .catalogOwner(catalogOwner)
                .repriceNeeded(repriceNeeded)
                .droppedOverrides(droppedOverrides)
                .issuedAt(q.getIssuedAt())
                .validUntil(q.getValidUntil())
                .deposit(toDeposit(q))
                .build();
    }

    /**
     * An issued, expired or superseded version, from its stored rows and its snapshot alone: it reads the same
     * whatever the request or the catalog do later. It has no readiness and never asks for a re-price.
     */
    public static QuotationDraftResponse toIssuedResponse(
            Quotation q,
            TransportRequest request,
            QuotationSnapshot snapshot,
            Integer latestPublishedVersionNo,
            String catalogOwner) {
        List<QuotationLine> lines = q.getLines().stream()
                .sorted(Comparator.comparing(QuotationLine::getGroupCode).thenComparing(QuotationLine::getPosition))
                .toList();
        QuotationSnapshot.Facts facts = snapshot.request();
        BigDecimal pricedSum = lines.stream()
                .map(QuotationMapper::amount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return QuotationDraftResponse.builder()
                .id(q.getId())
                .code(q.getCode())
                .versionNo(q.getVersionNo())
                .status(q.getStatus())
                .pinnedVersion(new PinnedVersionResponse(
                        q.getRateCatalogVersion().getId(),
                        q.getRateCatalogVersion().getVersionNo()))
                .latestPublishedVersionNo(latestPublishedVersionNo)
                .request(QuotationRequestFacts.builder()
                        .id(request.getId())
                        .code(request.getCode())
                        .club(
                                request.getClub() == null
                                        ? null
                                        : request.getClub().getName())
                        .fromCity(facts.fromCity())
                        .toCity(facts.toCity())
                        .mode(facts.mode())
                        .trailer(facts.trailer())
                        .requestedClass(request.getAirClass())
                        .horseCount(facts.horses().size())
                        .departureDate(facts.departureDate())
                        .dateFlexDays(facts.dateFlexDays())
                        .insurance(facts.insurance())
                        .vetEscort(facts.vetEscort())
                        .build())
                .airClass(q.getAirClass())
                .fit(
                        snapshot.fit() == null
                                ? null
                                : new StallFitResponse(
                                        snapshot.fit().positions(),
                                        snapshot.fit().widthUsedIn(),
                                        null,
                                        List.of()))
                .groups(toGroups(lines, facts.mode()))
                .totals(QuoteTotalsResponse.builder()
                        .pricedLines(pricedSum)
                        .subtotal(q.getSubtotal())
                        .rows(snapshot.rows().stream()
                                .map(r -> new QuoteTotalRowResponse(r.key(), r.label(), r.baseText(), r.amount()))
                                .toList())
                        .total(q.getTotal())
                        .build())
                .missing(List.of())
                .readiness(null)
                .currency(q.getCurrency())
                .catalogOwner(catalogOwner)
                .repriceNeeded(false)
                .droppedOverrides(List.of())
                .issuedAt(q.getIssuedAt())
                .validUntil(q.getValidUntil())
                .deposit(toDeposit(q))
                .build();
    }

    public static QuotationVersionResponse toVersion(Quotation q) {
        return new QuotationVersionResponse(
                q.getVersionNo(),
                q.getStatus(),
                q.getIssuedAt(),
                q.getValidUntil(),
                q.getTotal(),
                q.getSupersededReason());
    }

    /** The version a revision replaces: its total and each keyed line's amount. */
    public static PreviousVersionResponse toPrevious(Quotation q) {
        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        q.getLines().stream()
                .filter(l -> l.getLineKey() != null && amount(l) != null)
                .forEach(l -> amounts.put(l.getLineKey(), amount(l)));
        return new PreviousVersionResponse(q.getVersionNo(), q.getTotal(), amounts);
    }

    private static DepositResponse toDeposit(Quotation q) {
        return q.getDepositPct() == null ? null : new DepositResponse(q.getDepositPct(), q.getDepositAmount());
    }

    /**
     * Whether the stored lines or totals no longer agree with the engine's answer for the request as it is now
     * (with the stored adjustments applied): the draft must be re-priced before it can be trusted or issued.
     */
    public static boolean repriceNeeded(Quotation q, PricedQuote now, PricedTotals expected) {
        List<QuotationLine> lines = q.getLines().stream()
                .sorted(Comparator.comparing(QuotationLine::getGroupCode).thenComparing(QuotationLine::getPosition))
                .toList();
        return !sameLines(lines, now.lines()) || !sameTotals(q, expected);
    }

    private static QuotationRequestFacts toFacts(TransportRequest r) {
        return QuotationRequestFacts.builder()
                .id(r.getId())
                .code(r.getCode())
                .club(r.getClub() == null ? null : r.getClub().getName())
                .fromCity(city(r.getOriginPlace(), r.getCorridor().getOriginCity()))
                .toCity(city(r.getDestinationPlace(), r.getCorridor().getDestinationCity()))
                .mode(r.getMode())
                .trailer(r.getTrailer())
                .requestedClass(r.getAirClass())
                .horseCount(r.getHorses().size())
                .departureDate(r.getDepartureDate())
                .dateFlexDays(r.getDateFlexDays())
                .insurance(r.getInsurance())
                .vetEscort(r.isVetEscort())
                .build();
    }

    private static String city(Place place, String fallback) {
        return place == null ? fallback : place.getCity();
    }

    private static StallFitResponse toFit(StallFit fit) {
        return fit == null
                ? null
                : new StallFitResponse(fit.positions(), fit.widthUsedIn(), fit.refusal(), fit.achievableClasses());
    }

    private static List<QuoteGroupResponse> toGroups(List<QuotationLine> lines, TransportMode mode) {
        Map<String, List<QuotationLine>> byGroup = new LinkedHashMap<>();
        lines.forEach(l -> byGroup.computeIfAbsent(l.getGroupCode(), g -> new ArrayList<>())
                .add(l));
        return byGroup.entrySet().stream()
                .map(e -> {
                    boolean complete = e.getValue().stream().allMatch(l -> amount(l) != null);
                    BigDecimal subtotal = complete
                            ? e.getValue().stream()
                                    .map(QuotationMapper::amount)
                                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                            : null;
                    return new QuoteGroupResponse(
                            e.getKey(),
                            PricingText.groupName(e.getKey(), mode),
                            subtotal,
                            e.getValue().stream().map(QuotationMapper::toLine).toList());
                })
                .toList();
    }

    private static QuoteLineResponse toLine(QuotationLine l) {
        return QuoteLineResponse.builder()
                .id(l.getId())
                .lineKey(l.getLineKey())
                .description(l.getDescription())
                .basisText(l.getBasisText())
                .quantity(l.getQuantity())
                .unitRate(l.getUnitRate())
                .amount(amount(l))
                .certainty(l.getCertainty())
                .estimateNote(l.getEstimateNote())
                .source(l.getSource())
                .catalogAmount(l.getCatalogAmount())
                .overrideAmount(l.getOverrideAmount())
                .overrideReason(l.getOverrideReason())
                .manual(l.getManualReason() != null)
                .manualReason(l.getManualReason())
                .build();
    }

    /** The line's total: an override when there is one, else the catalog amount (the generated line_total). */
    private static BigDecimal amount(QuotationLine l) {
        return l.getOverrideAmount() != null ? l.getOverrideAmount() : l.getCatalogAmount();
    }

    /** Whether the stored totals are what the engine works out now (cover or declared values may have changed). */
    private static boolean sameTotals(Quotation q, PricedTotals now) {
        return same(q.getSubtotal(), now.subtotal())
                && same(q.getVolumeBreak(), now.volumeBreak())
                && same(q.getArrivalWindowSurcharge(), now.arrivalWindow())
                && same(q.getFuel(), now.fuel())
                && same(q.getInsurance(), now.insurance())
                && same(q.getContingency(), now.contingency())
                && same(q.getServiceFee(), now.serviceFee())
                && same(q.getTotal(), now.total());
    }

    private static boolean same(BigDecimal a, BigDecimal b) {
        return a == null ? b == null : b != null && a.compareTo(b) == 0;
    }

    /**
     * Whether the stored engine lines are what the engine gives now. Added lines are the manager's, not the
     * engine's, so they are left out; a line stored before keys existed matches on its other fields.
     */
    private static boolean sameLines(List<QuotationLine> all, List<PricedLine> now) {
        List<QuotationLine> stored =
                all.stream().filter(l -> l.getManualReason() == null).toList();
        if (stored.size() != now.size()) {
            return false;
        }
        for (int i = 0; i < stored.size(); i++) {
            QuotationLine s = stored.get(i);
            PricedLine p = now.get(i);
            boolean same = s.getGroupCode().equals(p.group())
                    && (s.getLineKey() == null || s.getLineKey().equals(p.lineKey()))
                    && s.getDescription().equals(p.description())
                    && Objects.equals(s.getBasisText(), p.basisText())
                    && same(s.getCatalogAmount(), p.amount());
            if (!same) {
                return false;
            }
        }
        return true;
    }
}
