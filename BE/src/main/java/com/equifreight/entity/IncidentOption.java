package com.equifreight.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Setter
@Getter
@Entity
@Table(name = "incident_options")
public class IncidentOption extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 1000)
    private String description;

    /**
     * Time, documents, the horse, cost, as JSON.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    private String facts;

    @Column(nullable = false)
    private short position;

    /** The estimated extra cost, in the job's quotation currency (US-F5-02). */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal extraCost = BigDecimal.ZERO;

    /** The minutes it adds to the arrival. */
    @Column(nullable = false)
    private int delayMinutes;

    /** True when it takes the horses another way: approving it gives the trip a new route version (US-F5-03). */
    @Column(nullable = false)
    private boolean changesRoute;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
}
