package com.equifreight.entity;

import com.equifreight.entity.enums.DocumentReview;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * An uploaded version of a checklist document. Append-only (BR-F2-05): a trigger allows only the one review
 * decision on a PENDING version, and only by a transport specialist (BR-F2-04).
 */
@Setter
@Getter
@Entity
@Table(name = "document_versions")
public class DocumentVersion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_item_id", nullable = false)
    private ChecklistItem checklistItem;

    @Column(nullable = false)
    private short versionNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false)
    private StoredFile file;

    /**
     * What the validity rule reads.
     */
    private LocalDate issuedOn;

    private LocalDate sampledOn;

    private LocalDate validUntil;

    /**
     * "PVI Insurance", "Dept. of Animal Health".
     */
    @Column(length = 120)
    private String issuer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(nullable = false)
    private Instant uploadedAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DocumentReview review = DocumentReview.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    private Instant reviewedAt;

    /**
     * Required when REJECTED, visible to the customer (BR-F2-07).
     */
    @Column(length = 500)
    private String rejectReason;
}
