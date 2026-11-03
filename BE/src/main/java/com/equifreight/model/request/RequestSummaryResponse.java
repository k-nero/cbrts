package com.equifreight.model.request;

import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.model.home.TonedTextResponse;
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
        QuotationIssuedRefResponse quotation,
        /** Where an approved request's move stands; null before approval. */
        MoveProgressResponse move,
        /** What holds it, in words and a tone ("Quotation waiting for you"); null once nothing does. */
        TonedTextResponse holds,
        /** The day the club's step is due by, in the business time zone; null when it has none or isn't theirs. */
        LocalDate dueOn) {}
