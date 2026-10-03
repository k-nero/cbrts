package com.equifreight.entity;

import com.equifreight.entity.enums.RouteStopKind;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * A stop of a route plan. A BORDER stop names a crossing, every other kind a place (DB check). With an arrival
 * window, the delivery stop must be planned before the job's windowEnd (application rule).
 */
@Setter
@Getter
@Entity
@Table(name = "route_stops")
public class RouteStop extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_plan_id", nullable = false)
    private RoutePlan routePlan;

    @Column(nullable = false)
    private short seq;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private RouteStopKind kind;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id")
    private Place place;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "border_crossing_id")
    private BorderCrossing borderCrossing;

    private Instant plannedAt;

    private Short plannedStayMin;

    @Column(length = 500)
    private String details;
}
