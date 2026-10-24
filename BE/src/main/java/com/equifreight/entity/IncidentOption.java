package com.equifreight.entity;

import com.equifreight.entity.enums.LeavingKind;
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

    /** How the horses leave the moving trip, when this option takes any off it (US-F5-06). */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private LeavingKind leavingKind;

    /** Where they are unloaded or left in care, as written. */
    @Column(length = 200)
    private String leavingPlace;

    /** The second vehicle that collects them. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    /** Who bears the extra cost as proposed: the customer, else EquiFreight. The manager decides. */
    @Column(nullable = false)
    private boolean customerPays;

    /** The horses that leave: the incident's job's horses on the trip, all or some. */
    @ManyToMany
    @JoinTable(
            name = "incident_option_horses",
            joinColumns = @JoinColumn(name = "option_id"),
            inverseJoinColumns = @JoinColumn(name = "horse_id"))
    private java.util.Set<Horse> horses = new java.util.HashSet<>();
}
