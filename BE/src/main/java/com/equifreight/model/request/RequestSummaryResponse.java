package com.equifreight.model.request;

import com.equifreight.entity.enums.RequestStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

/** A row of the club's requests list. */
@Builder(toBuilder = true)
public record RequestSummaryResponse(
        UUID id,
        String code,
        RequestStatus status,
        EndpointResponse origin,
        EndpointResponse destination,
        LocalDate departureDate,
        long horseCount,
        Instant createdAt,
        Instant submittedAt,
        QuotationIssuedRefResponse quotation) {}
