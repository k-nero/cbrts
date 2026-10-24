package com.equifreight.entity;

import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentSource;
import com.equifreight.entity.enums.IncidentStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Every incident has one owner, the logistics manager. A customer report is answered within 2 hours.
 */
@Setter
@Getter
@Entity
@Table(name = "incidents")
public class Incident extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IncidentKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private IncidentSource source;

    /**
     * The escort's record, quoted verbatim.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_record_id")
    private TripRecord tripRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private IncidentStatus status = IncidentStatus.OPEN;

    /** What happened, as the reporter wrote it. */
    @Column(nullable = false, length = 500)
    private String summary;

    /** Where it happened, as the reporter wrote it ("QL22 km 41, before Gò Dầu"). */
    @Column(length = 200)
    private String location;

    /** The horse it concerns; a horse medical incident names one. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "horse_id")
    private Horse horse;

    /** Who reported it: the escort on the cab, or staff. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by")
    private User reportedBy;

    /** The tablet's reference for the report, so a resend returns the incident already opened. */
    private UUID clientRef;

    @Column(nullable = false)
    private Instant openedAt = Instant.now();

    private Instant replyDueAt;

    /**
     * An authority hold or a welfare stop: the arrival-window clock and the handover deadline pause while open.
     */
    @Column(nullable = false)
    private boolean stopsClock;

    private Instant clockStoppedFrom;

    private Instant clockStoppedUntil;

    /** The option the coordinator proposes for approval (US-F5-02); cleared when the manager sends it back. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_option_id")
    private IncidentOption proposedOption;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_by")
    private User proposedBy;

    private Instant proposedAt;

    @Column(length = 1000)
    private String proposalNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_option_id")
    private IncidentOption decidedOption;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private User decidedBy;

    private Instant decidedAt;

    @Column(length = 1000)
    private String decisionNote;

    /** What the customer was told about the decision, sent as written (US-F5-03). */
    @Column(length = 1000)
    private String customerMessage;

    /** Whether the customer pays the decided option's extra cost (a job charge for the final invoice). */
    private Boolean chargeCustomer;

    /** The trip the leaving horses moved to (US-F5-06). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_trip_id")
    private Trip newTrip;

    /** The route version the decision gave the trip, if it changed the route or the times. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_plan_id")
    private RoutePlan routePlan;

    private Instant resolvedAt;

    @OneToMany(mappedBy = "incident", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<IncidentOption> options = new ArrayList<>();

    /**
     * The photos with a report.
     */
    @ManyToMany
    @JoinTable(
            name = "incident_files",
            joinColumns = @JoinColumn(name = "incident_id"),
            inverseJoinColumns = @JoinColumn(name = "file_id"))
    private Set<StoredFile> files = new HashSet<>();
}
