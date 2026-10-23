package com.equifreight.model.quotation;

import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.service.quotation.QuotationSnapshot;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * The customer's Quotation page (spec §6.1): the latest issued version, read from its stored rows and snapshot only.
 * Every line says whether it is fixed or estimated (US-Q-06) and whether the manager overrode or added it (US-Q-02),
 * with the reason; the deposit and the cancellation fees come before acceptance (US-Q-08).
 *
 * @param estimate the range kept at submission against this total; null when none was kept
 * @param latePenalty the late-arrival terms when the move has an arrival window; null otherwise
 * @param versions every version that was issued, newest first
 * @param requestStatus where the request stands; a cancelled request can't be answered whatever this version's status
 * @param acceptedAt when the customer accepted this version (US-F1-06); null until then
 * @param declinedAt when the customer declined this version; null unless declined
 * @param cancelledAt when the customer cancelled the request; null unless cancelled
 * @param cancellationFeePct the fee band applied at cancelling (BR-F1-07); null unless cancelled
 */
@Builder
public record CustomerQuotationResponse(
        String code,
        short versionNo,
        QuotationStatus status,
        RequestStatus requestStatus,
        Instant issuedAt,
        Instant validUntil,
        Instant acceptedAt,
        Instant declinedAt,
        Instant cancelledAt,
        BigDecimal cancellationFeePct,
        String currency,
        int pinnedVersionNo,
        Request request,
        List<Group> groups,
        String stallNote,
        Totals totals,
        Estimate estimate,
        DepositResponse deposit,
        Cancellation cancellation,
        LatePenalty latePenalty,
        PreparedBy preparedBy,
        List<Version> versions) {

    /** The request as quoted. */
    public record Request(
            UUID id,
            String code,
            String fromCity,
            String toCity,
            TransportMode mode,
            TrailerType trailer,
            ServiceClass airClass,
            List<QuotationSnapshot.Horse> horses,
            LocalDate departureDate,
            short dateFlexDays,
            ArrivalMode arrivalMode,
            Instant windowStart,
            Instant windowEnd,
            InsuranceOption insurance,
            boolean vetEscort) {}

    public record Group(String code, String name, BigDecimal subtotal, List<Line> lines) {}

    /**
     * A line as the customer reads it. {@code amount} is the override when there is one; {@code catalogAmount} is
     * what the catalog gave, shown struck through on an overridden line.
     */
    public record Line(
            String description,
            String basisText,
            BigDecimal quantity,
            BigDecimal unitRate,
            BigDecimal amount,
            LineCertainty certainty,
            String estimateNote,
            boolean overridden,
            BigDecimal catalogAmount,
            String overrideReason,
            boolean manual,
            String manualReason) {}

    public record Totals(BigDecimal subtotal, List<QuoteTotalRowResponse> rows, BigDecimal total) {}

    /** {@code inside} when low ≤ total ≤ high. */
    public record Estimate(BigDecimal low, BigDecimal high, boolean inside) {}

    /**
     * The cancellation fee by notice period, from the pinned catalog; {@code current} marks the band the days left
     * before departure fall in today.
     */
    public record Cancellation(long daysToDeparture, List<Band> bands) {}

    public record Band(int minDays, Integer maxDays, BigDecimal pct, boolean current) {}

    public record LatePenalty(BigDecimal pctPerHour, BigDecimal capPct) {}

    public record PreparedBy(String name, String role) {}

    public record Version(
            short versionNo, QuotationStatus status, Instant issuedAt, Instant validUntil, String supersededReason) {}
}
