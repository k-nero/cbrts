package com.equifreight.entity;

import com.equifreight.entity.enums.InsuranceClaimStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * An insurance claim on an incident of a job insured with EquiFreight (US-F5-08), one per incident. The insurer pays
 * the owner directly, so the claim records what was claimed and paid; it is never a payment or an invoice line.
 */
@Setter
@Getter
@Entity
@Table(name = "insurance_claims")
public class InsuranceClaim extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false, unique = true)
    private Incident incident;

    /** "PVI Insurance". */
    @Column(nullable = false, length = 120)
    private String insurer;

    /** The insurer's claim reference. */
    @Column(nullable = false, length = 60)
    private String reference;

    /** In the job's quotation currency. */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal claimedAmount;

    @Column(length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private InsuranceClaimStatus status = InsuranceClaimStatus.FILED;

    /** What the insurer paid, once settled; never more than claimed. */
    @Column(precision = 14, scale = 2)
    private BigDecimal settledAmount;

    @Column(length = 300)
    private String declineReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filed_by", nullable = false)
    private User filedBy;

    @Column(nullable = false)
    private Instant filedAt;

    /** Who recorded the outcome, and when. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    private Instant closedAt;
}
