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

    /** The transport specialist who owns the job's documents and clearance; assigned at approval (US-F1-07). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transport_specialist_id")
    private User transportSpecialist;

    /** The fleet & route coordinator who plans the job; assigned at approval. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coordinator_id")
    private User coordinator;

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

    /** The logistics manager who closed the job (US-F6-04). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    /** Delivered on time, as recorded at closing: within the window, or by the planned arrival without one. */
    private Boolean onTime;

    /** Minutes late at closing, less a stopped clock; 0 when on time. */
    private Integer lateMinutes;

    private Instant signedOffAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signed_off_by")
    private User signedOffBy;
}
