package com.equifreight.entity;

import com.equifreight.entity.enums.HandoverOutcome;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * One per job. The late-arrival penalty is credited as a line on the final invoice.
 */
@Setter
@Getter
@Entity
@Table(name = "handovers")
public class Handover extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false, unique = true)
    private TransportJob job;

    /**
     * From the DELIVERED trip record.
     */
    private Instant deliveredAt;

    /**
     * "Sophea, receiving groom".
     */
    @Column(length = 120)
    private String receivingName;

    /**
     * Within 2 days; paused while an incident is open.
     */
    private Instant confirmDueAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private HandoverOutcome customerOutcome;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by")
    private User confirmedBy;

    private Instant confirmedAt;

    /**
     * Minutes after windowEnd, minus minutes the clock was stopped. Null when there's no window.
     */
    private Integer lateMinutes;

    /**
     * ⌈lateMinutes ÷ 60⌉ × pct × total, capped.
     */
    @Column(precision = 14, scale = 2)
    private BigDecimal penaltyAmount;

    /** When the horses were handed over, from the HANDED_OVER trip record; fixed once set (US-F6-01). */
    private Instant handedOverAt;

    /** The HANDED_OVER record: each horse's condition and photos, and what was handed over. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handover_record_id")
    private TripRecord handoverRecord;

    /** The receiver confirmed on the tablet that they took the horses as recorded. */
    private boolean receiverConfirmed;
}
