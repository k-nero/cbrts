package com.equifreight.entity;

import jakarta.persistence.*;
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

    /** Time, documents, the horse, cost, as JSON. */
    @JdbcTypeCode(SqlTypes.JSON)
    private String facts;

    @Column(nullable = false)
    private short position;
}
