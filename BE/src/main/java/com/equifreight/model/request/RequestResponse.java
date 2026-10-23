package com.equifreight.model.request;

import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.route.RouteResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * A transport request. {@code leadTime} and {@code blockers} are worked out while the customer may still change
 * it: a draft, or a request returned for information.
 */
@Builder(toBuilder = true)
public record RequestResponse(
        UUID id,
        /** Null until submitted. */
        String code,
        RequestStatus status,
        Instant createdAt,
        Instant updatedAt,
        Instant submittedAt,
        List<RequestHorseResponse> horses,
        EndpointResponse origin,
        EndpointResponse destination,
        LocalDate departureDate,
        int dateFlexDays,
        ArrivalMode arrivalMode,
        Instant windowStart,
        Instant windowEnd,
        String specialInstructions,
        TransportMode mode,
        TrailerType trailer,
        ServiceClass airClass,
        InsuranceOption insurance,
        boolean vetEscort,
        /** The range shown at the latest submission (US-Q-05); null for a draft or when there was none. */
        BigDecimal estimateLow,
        BigDecimal estimateHigh,
        RouteResponse route,
        LeadTimeResponse leadTime,
        List<Blocker> blockers,
        /** The logistics manager's note while the request is INFO_REQUIRED (US-F1-04). */
        String infoRequiredNote,
        /** Why the logistics manager rejected the request; null unless REJECTED (BR-F1-04). */
        String rejectReason,
        /** When the customer cancelled the request; null unless CANCELLED (BR-F1-07). */
        Instant cancelledAt,
        /** The cancellation fee band applied when it was cancelled, as a %; null unless CANCELLED. */
        BigDecimal cancellationFeePct,
        /** Every submitted version, oldest first; empty for a draft. */
        List<RevisionSummaryResponse> revisions,
        /** The customer's club; set on staff views only. */
        String club,
        /** The latest issued quotation; set on the customer's read of the request, null until one is issued. */
        QuotationIssuedRefResponse quotation) {}
