package com.equifreight.entity;

import com.equifreight.entity.enums.CatalogStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Immutable once published; a job pins the versions its checklist was built from (BR-F2-01).
 */
@Setter
@Getter
@Entity
@Table(name = "regulation_versions")
public class RegulationVersion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catalog_id", nullable = false)
    private RegulationCatalog catalog;

    @Column(nullable = false)
    private int versionNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private CatalogStatus status = CatalogStatus.DRAFT;

    private Instant publishedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_by")
    private User publishedBy;

    /**
     * 21 cross-border, 3 domestic (BR-F1-01).
     */
    @Column(nullable = false)
    private short leadTimeDays;

    @Column(nullable = false)
    private short quarantineMinDays;

    @Column(nullable = false)
    private short arrivalBufferDays;

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RegulationRule> rules = new ArrayList<>();
}
