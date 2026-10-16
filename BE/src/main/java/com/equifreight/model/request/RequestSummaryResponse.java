package com.equifreight.model.request;

import com.equifreight.entity.enums.RequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A row of the club's requests list. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestSummaryResponse {
    private UUID id;
    private String code;
    private RequestStatus status;
    private EndpointResponse origin;
    private EndpointResponse destination;
    private LocalDate departureDate;
    private long horseCount;
    private Instant createdAt;
    private Instant submittedAt;
}
