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
     */
    public static QuotationDraftResponse toDraftResponse(
            Quotation q,
            TransportRequest request,
            ServiceClass airClass,
            PricedQuote now,
            Integer latestPublishedVersionNo,
            Integer validityDays,
            String catalogOwner) {
        List<QuotationLine> lines = q.getLines().stream()
                .sorted(Comparator.comparing(QuotationLine::getGroupCode).thenComparing(QuotationLine::getPosition))
                .toList();
        TransportMode mode = request.getCorridor().getMode();
        boolean repriceNeeded = !sameLines(lines, now.lines()) || !sameTotals(q, now.totals());
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
                        .rows(now.totals().rows().stream()
                                .map(r -> new QuoteTotalRowResponse(
                                        r.key(), r.label(), r.baseText(), repriceNeeded ? null : r.amount()))
                                .toList())
                        .total(q.getTotal())
                        .build())
                .missing(now.missing().stream()
                        .map(RateMapper::toMissingResponse)
                        .toList())
                .readiness(new ReadinessResponse(q.getTotal() != null && !repriceNeeded, priced, lines.size()))
                .validityDays(validityDays)
                .currency(q.getCurrency())
                .catalogOwner(catalogOwner)
                .repriceNeeded(repriceNeeded)
                .build();
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
                .description(l.getDescription())
                .basisText(l.getBasisText())
                .quantity(l.getQuantity())
                .unitRate(l.getUnitRate())
                .amount(amount(l))
                .certainty(l.getCertainty())
                .estimateNote(l.getEstimateNote())
                .source(l.getSource())
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
                && same(q.getFuel(), now.fuel())
                && same(q.getInsurance(), now.insurance())
                && same(q.getContingency(), now.contingency())
                && same(q.getServiceFee(), now.serviceFee())
                && same(q.getTotal(), now.total());
    }

    private static boolean same(BigDecimal a, BigDecimal b) {
        return a == null ? b == null : b != null && a.compareTo(b) == 0;
    }

    private static boolean sameLines(List<QuotationLine> stored, List<PricedLine> now) {
        if (stored.size() != now.size()) {
            return false;
        }
        for (int i = 0; i < stored.size(); i++) {
            QuotationLine s = stored.get(i);
            PricedLine p = now.get(i);
            boolean same = s.getGroupCode().equals(p.group())
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
