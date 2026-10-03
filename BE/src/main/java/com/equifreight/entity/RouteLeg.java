package com.equifreight.entity;

import com.equifreight.entity.enums.TransportMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** The line between two stops. A road leg names the vehicle; an air leg has a {@link Flight}. */
@Setter
@Getter
@Entity
@Table(name = "route_legs")
public class RouteLeg extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_plan_id", nullable = false)
    private RoutePlan routePlan;

    @Column(nullable = false)
    private short seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_stop_id", nullable = false)
    private RouteStop fromStop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_stop_id", nullable = false)
    private RouteStop toStop;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransportMode mode;

    /** Road legs only. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    private Integer distanceKm;

    private Integer plannedMin;

    @OneToOne(mappedBy = "routeLeg", cascade = CascadeType.ALL, orphanRemoval = true)
    private Flight flight;
}
