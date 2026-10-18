package com.equifreight.model.request;

import com.equifreight.entity.enums.ArrivalMode;
import com.equifreight.entity.enums.InsuranceOption;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.ServiceClass;
import com.equifreight.entity.enums.TrailerType;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.route.RouteResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * A transport request. {@code leadTime} and {@code blockers} are worked out while the customer may still change
 * it: a draft, or a request returned for information.
 */
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class RequestResponse {
    private UUID id;
    /** Null until submitted. */
    private String code;
    private RequestStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant submittedAt;
    private List<RequestHorseResponse> horses;
    private EndpointResponse origin;
    private EndpointResponse destination;
    private LocalDate departureDate;
    private int dateFlexDays;
    private ArrivalMode arrivalMode;
    private Instant windowStart;
    private Instant windowEnd;
    private String specialInstructions;
    private TransportMode mode;
    private TrailerType trailer;
    private ServiceClass airClass;
    private InsuranceOption insurance;
    private boolean vetEscort;
    private RouteResponse route;
    private LeadTimeResponse leadTime;
    private List<Blocker> blockers;
    /** The logistics manager's note while the request is INFO_REQUIRED (US-F1-04). */
    private String infoRequiredNote;
    /** Every submitted version, oldest first; empty for a draft. */
    private List<RevisionSummaryResponse> revisions;
    /** The customer's club; set on staff views only. */
    private String club;
}
