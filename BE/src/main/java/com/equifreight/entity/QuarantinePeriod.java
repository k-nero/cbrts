package com.equifreight.entity;

import com.equifreight.entity.enums.QuarantineKind;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/**
 * At least the pinned quarantine_min_days long (application rule, BR-F2-06).
 */
@Setter
@Getter
@Entity
@Table(name = "quarantine_periods")
public class QuarantinePeriod extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    /**
     * Null means the whole load.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "horse_id")
    private Horse horse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    /**
     * Pre-export unless set; the form doesn't ask yet.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuarantineKind kind = QuarantineKind.PRE_EXPORT;

    @Column(nullable = false)
    private LocalDate startsOn;

    @Column(nullable = false)
    private LocalDate endsOn;

    private Instant completedAt;
}
