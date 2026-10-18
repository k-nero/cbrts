package com.equifreight.entity;

import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.entity.enums.TripStatus;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * Exactly one job per approved request (BR-F1-05). The DB refuses a departure before the dossier is
 * CLEARANCE_READY (BR-F2-03) and an approver who isn't a logistics manager (BR-F1-04).
 */
@Setter
@Getter
@Entity
@Table(name = "transport_jobs")
public class TransportJob extends BaseEntity {

    /**
     * CBRT-2026-041.
     */
    @Column(nullable = false, unique = true, length = 14)
    private String code;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false, unique = true)
    private TransportRequest request;

    /**
     * The accepted version.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by", nullable = false)
    private User approvedBy;

    @Column(nullable = false)
    private Instant approvedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private JobStage stage = JobStage.DOCUMENTS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DossierStatus dossierStatus = DossierStatus.OPEN;

    /**
     * When the gate opened ("Cleared 17 Oct, 16:20 by Lan").
     */
    private Instant clearanceReadyAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TripStatus tripStatus = TripStatus.NOT_STARTED;

    /**
     * Changing the planned dates re-evaluates every checklist item (Flow 2, B8).
     */
    private Instant plannedDepartureAt;

    private Instant plannedArrivalAt;

    /**
     * Copied from the request; the route is planned backwards from windowEnd.
     */
    private Instant windowStart;

    private Instant windowEnd;

    private Instant departedAt;

    private Instant deliveredAt;

    private Instant closedAt;

    private Instant signedOffAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signed_off_by")
    private User signedOffBy;
}
