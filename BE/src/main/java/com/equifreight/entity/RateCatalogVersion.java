package com.equifreight.entity;

import com.equifreight.entity.enums.CatalogStatus;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * One version of the rate catalog. At most one draft; a published version is immutable (its child rows are
 * guarded by a trigger) and is pinned by every quotation priced from it.
 */
@Setter
@Getter
@Entity
@Table(name = "rate_catalog_versions")
public class RateCatalogVersion extends BaseEntity {

    @Column(nullable = false, unique = true)
    private int versionNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private CatalogStatus status = CatalogStatus.DRAFT;

    private Instant publishedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_by")
    private User publishedBy;

    @Column(length = 500)
    private String changeNote;

    /**
     * Who changed the draft last.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_edited_by")
    private User lastEditedBy;
}
