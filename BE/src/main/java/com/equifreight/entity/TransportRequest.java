package com.equifreight.entity;

import com.equifreight.entity.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * A customer's transport request (Flow 1). One route and one arrival window per request (BR-F1-02); the arrival
 * window is only allowed for road, private trailer, fixed dates, at least 3 hours (DB check).
 */
@Setter
@Getter
@Entity
@Table(name = "transport_requests")
public class TransportRequest extends BaseEntity {

    /**
     * REQ-2026-0193. Issued at submission; null for a draft.
     */
    @Column(unique = true, length = 14)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RequestStatus status = RequestStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private TransportMode mode;

    /**
     * Road only.
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private TrailerType trailer;

    /**
     * Air only.
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private ServiceClass airClass;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private InsuranceOption insurance;

    /**
     * Added automatically from 8 horses or above the high-value threshold (application rule).
     */
    @Column(nullable = false)
    private boolean vetEscort;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "origin_place_id")
    private Place originPlace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_place_id")
    private Place destinationPlace;

    /**
     * What the customer typed when it matches no place ("Singapore"); never set with the place.
     */
    @Column(length = 160)
    private String originText;

    @Column(length = 160)
    private String destinationText;

    /**
     * Resolved from the places' cities and the mode; null means a route we don't run (yet).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corridor_id")
    private Corridor corridor;

    /**
     * The domestic road leg from the origin's city to the hub {@link #corridor} leaves from (US-F1-09): Da Nang →
     * Ho Chi Minh City before the flight. Null when the corridor starts in the origin's city.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "first_leg_corridor_id")
    private Corridor firstLegCorridor;

    /** The domestic road leg from the hub {@link #corridor} arrives in to the destination's city; null when none. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_leg_corridor_id")
    private Corridor lastLegCorridor;

    /** Required once submitted. */
    private LocalDate departureDate;

    /**
     * 0 for fixed dates; otherwise the route's flexible days, 1 to 7, copied at submission (#115).
     */
    @Column(nullable = false)
    private short dateFlexDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ArrivalMode arrivalMode = ArrivalMode.ANY_TIME;

    private Instant windowStart;

    private Instant windowEnd;

    @Column(length = 500)
    private String specialInstructions;

    /**
     * The range shown at submission, kept so a quotation can be compared with it ("Inside your range").
     */
    @Column(precision = 14, scale = 2)
    private BigDecimal estimateLow;

    @Column(precision = 14, scale = 2)
    private BigDecimal estimateHigh;

    private Instant submittedAt;

    /**
     * Express override of the lead time (BR-F1-01).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_time_override_by")
    private User leadTimeOverrideBy;

    private Instant leadTimeOverrideAt;

    @Column(length = 500)
    private String leadTimeOverrideReason;

    /**
     * Required when REJECTED.
     */
    @Column(length = 500)
    private String rejectReason;

    /**
     * Required when INFO_REQUIRED.
     */
    @Column(length = 1000)
    private String infoRequiredNote;

    private Instant cancelledAt;

    /**
     * The fee band at the time of cancelling (BR-F1-07).
     */
    @Column(precision = 5, scale = 2)
    private BigDecimal cancellationFeePct;

    /**
     * Locked once the request is APPROVED (BR-F1-06, trigger).
     */
    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RequestHorse> horses = new ArrayList<>();
}
