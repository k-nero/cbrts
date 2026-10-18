package com.equifreight.model.request;

import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.route.RouteResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/** A transport request. {@code leadTime} and {@code blockers} are only worked out for a draft. */
@Builder
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
        RouteResponse route,
        LeadTimeResponse leadTime,
        List<Blocker> blockers) {}
