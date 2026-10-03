package com.equifreight.entity;

import com.equifreight.entity.enums.SubmissionKind;
import com.equifreight.entity.enums.SubmissionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

/** The offline filing step the specialist records. */
@Setter
@Getter
@Entity
@Table(name = "authority_submissions")
public class AuthoritySubmission extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authority_id", nullable = false)
    private Authority authority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SubmissionKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubmissionStatus status = SubmissionStatus.READY_TO_FILE;

    private Instant filedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filed_by")
    private User filedBy;

    /** "ref KH-IP-2026-3381". */
    @Column(length = 60)
    private String referenceNo;

    /** SLA; "Overdue" is computed from it. */
    private LocalDate expectedBy;

    private Instant issuedAt;

    /** The permit or certificate, attached to the job. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "result_file_id")
    private StoredFile resultFile;

    /** The documents the dossier carries. */
    @ManyToMany
    @JoinTable(
            name = "authority_submission_items",
            joinColumns = @JoinColumn(name = "submission_id"),
            inverseJoinColumns = @JoinColumn(name = "checklist_item_id")
    )
    private Set<ChecklistItem> checklistItems = new HashSet<>();
}
