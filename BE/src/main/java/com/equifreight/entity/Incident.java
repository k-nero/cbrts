package com.equifreight.entity;

import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentSource;
import com.equifreight.entity.enums.IncidentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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

    @Column(nullable = false, length = 500)
    private String summary;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_option_id")
    private IncidentOption decidedOption;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private User decidedBy;

    private Instant decidedAt;

    @Column(length = 1000)
    private String decisionNote;

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
            inverseJoinColumns = @JoinColumn(name = "file_id")
    )
    private Set<StoredFile> files = new HashSet<>();
}
