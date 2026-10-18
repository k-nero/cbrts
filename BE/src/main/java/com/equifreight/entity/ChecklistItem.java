package com.equifreight.entity;

import com.equifreight.entity.enums.ChecklistHolder;
import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.Validity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * One required document of a job: per horse × document type, or per shipment, or per border crossing.
 * The job is CLEARANCE_READY when every mandatory item is CLEARED with GREEN validity and quarantine is done.
 */
@Setter
@Getter
@Entity
@Table(name = "checklist_items")
public class ChecklistItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_type_id", nullable = false)
    private DocumentType documentType;

    /**
     * The pinned rule it is checked against.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "regulation_rule_id")
    private RegulationRule regulationRule;

    /**
     * Required when the document scope is PER_HORSE.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "horse_id")
    private Horse horse;

    /**
     * Required when the document scope is PER_CROSSING.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "border_crossing_id")
    private BorderCrossing borderCrossing;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChecklistStatus status = ChecklistStatus.NOT_ISSUED;

    @Enumerated(EnumType.STRING)
    @Column(length = 5)
    private Validity validity;

    /**
     * "77 days old at departure. Upload a test sampled on 19 Aug or later."
     */
    @Column(length = 300)
    private String validityNote;

    private Instant evaluatedAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private ChecklistHolder holder;

    /**
     * Drives "Due in 8 days" and the T-7/T-3/T-1 reminders.
     */
    private LocalDate dueDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_version_id")
    private DocumentVersion currentVersion;
}
