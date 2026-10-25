package com.equifreight.model.quotation;

import com.equifreight.entity.Quotation;
import com.equifreight.entity.QuotationLine;
import com.equifreight.entity.RateFeeBand;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.service.pricing.PricingText;
import com.equifreight.service.quotation.CancellationFee;
import com.equifreight.service.quotation.QuotationSnapshot;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** An issued quotation to the customer's Quotation page, from its rows and snapshot only. */
public final class CustomerQuotationMapper {

    private CustomerQuotationMapper() {}

    /**
     * @param versions the request's quotation versions, newest first; drafts are left out here
     * @param daysToDeparture days from today to the departure as quoted, in the business zone
     */
    public static CustomerQuotationResponse toResponse(
            Quotation q,
            TransportRequest request,
            QuotationSnapshot snapshot,
            List<RateFeeBand> cancellation,
            long daysToDeparture,
            List<Quotation> versions) {
        QuotationSnapshot.Facts facts = snapshot.request();
        BigDecimal low = request.getEstimateLow();
        BigDecimal high = request.getEstimateHigh();
        return CustomerQuotationResponse.builder()
                .code(q.getCode())
                .versionNo(q.getVersionNo())
                .status(q.getStatus())
                .requestStatus(request.getStatus())
                .issuedAt(q.getIssuedAt())
                .validUntil(q.getValidUntil())
                .acceptedAt(q.getAcceptedAt())
                .declinedAt(q.getDeclinedAt())
                .cancelledAt(request.getCancelledAt())
                .cancellationFeePct(request.getCancellationFeePct())
                .currency(q.getCurrency())
                .pinnedVersionNo(q.getRateCatalogVersion().getVersionNo())
                .request(new CustomerQuotationResponse.Request(
                        request.getId(),
                        request.getCode(),
                        facts.fromCity(),
                        facts.toCity(),
                        facts.mode(),
                        facts.trailer(),
                        facts.airClass(),
                        facts.horses(),
                        facts.departureDate(),
                        facts.dateFlexDays(),
                        facts.arrivalMode(),
                        facts.windowStart(),
                        facts.windowEnd(),
                        facts.insurance(),
                        facts.vetEscort()))
                .groups(groups(q, facts))
                .stallNote(snapshot.stallNote())
                .totals(new CustomerQuotationResponse.Totals(
                        q.getSubtotal(),
                        snapshot.rows().stream()
                                .map(r -> new QuoteTotalRowResponse(r.key(), r.label(), r.baseText(), r.amount()))
                                .toList(),
                        q.getTotal()))
                .estimate(
                        low == null || high == null
                                ? null
                                : new CustomerQuotationResponse.Estimate(
                                        low,
                                        high,
                                        low.compareTo(q.getTotal()) <= 0
                                                && q.getTotal().compareTo(high) <= 0))
                .deposit(
                        q.getDepositPct() == null ? null : new DepositResponse(q.getDepositPct(), q.getDepositAmount()))
                .cancellation(new CustomerQuotationResponse.Cancellation(
                        daysToDeparture,
                        cancellation.stream()
                                .sorted(Comparator.comparing(RateFeeBand::getMinDays))
                                .map(b -> new CustomerQuotationResponse.Band(
                                        b.getMinDays(),
                                        b.getMaxDays() == null ? null : (int) b.getMaxDays(),
                                        b.getValue(),
                                        CancellationFee.applies(b, daysToDeparture)))
                                .toList()))
                .latePenalty(
                        q.getLatePenaltyPctPerHour() == null
                                ? null
                                : new CustomerQuotationResponse.LatePenalty(
                                        q.getLatePenaltyPctPerHour(), q.getLatePenaltyCapPct()))
                .preparedBy(
                        q.getPreparedBy() == null
                                ? null
                                : new CustomerQuotationResponse.PreparedBy(
                                        q.getPreparedBy().displayName(), "logistics manager"))
                .versions(versions.stream()
                        .filter(v -> v.getStatus() != QuotationStatus.DRAFT)
                        .map(v -> new CustomerQuotationResponse.Version(
                                v.getVersionNo(),
                                v.getStatus(),
                                v.getIssuedAt(),
                                v.getValidUntil(),
                                v.getSupersededReason()))
                        .toList())
                .nextVersion(nextVersion(q, request, versions))
                .build();
    }

    /**
     * The draft's number while a re-quote is being prepared (A4): the request expired, the version shown wasn't
     * declined (a decline is final), and the newest version is a draft. A manager's own revise of an open quotation
     * isn't one: the customer still answers the version shown.
     */
    private static Integer nextVersion(Quotation shown, TransportRequest request, List<Quotation> versions) {
        if (request.getStatus() != RequestStatus.EXPIRED
                || shown.getStatus() == QuotationStatus.DECLINED
                || versions.isEmpty()
                || versions.getFirst().getStatus() != QuotationStatus.DRAFT) {
            return null;
        }
        return (int) versions.getFirst().getVersionNo();
    }

    private static List<CustomerQuotationResponse.Group> groups(Quotation q, QuotationSnapshot.Facts facts) {
        Map<String, List<QuotationLine>> byGroup = new LinkedHashMap<>();
        q.getLines().stream()
                .sorted(Comparator.comparing(QuotationLine::getGroupCode).thenComparing(QuotationLine::getPosition))
                .forEach(l -> byGroup.computeIfAbsent(l.getGroupCode(), g -> new ArrayList<>())
                        .add(l));
        return byGroup.entrySet().stream()
                .map(e -> new CustomerQuotationResponse.Group(
                        e.getKey(),
                        PricingText.groupName(e.getKey(), facts.mode()),
                        e.getValue().stream()
                                .map(CustomerQuotationMapper::amount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add),
                        e.getValue().stream()
                                .map(CustomerQuotationMapper::toLine)
                                .toList()))
                .toList();
    }

    private static CustomerQuotationResponse.Line toLine(QuotationLine l) {
        return new CustomerQuotationResponse.Line(
                l.getDescription(),
                l.getBasisText(),
                l.getQuantity(),
                l.getUnitRate(),
                amount(l),
                l.getCertainty(),
                l.getEstimateNote(),
                l.getOverrideAmount() != null,
                l.getCatalogAmount(),
                l.getOverrideReason(),
                l.getManualReason() != null,
                l.getManualReason());
    }

    private static BigDecimal amount(QuotationLine l) {
        return l.getOverrideAmount() != null ? l.getOverrideAmount() : l.getCatalogAmount();
    }
}
