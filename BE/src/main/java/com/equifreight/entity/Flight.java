package com.equifreight.entity;

import com.equifreight.entity.enums.ServiceClass;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * The flight of an air leg. The airline owns the times, so scheduled and latest estimated times are kept apart;
 * actual times come from trip records.
 */
@Setter
@Getter
@Entity
@Table(name = "flights")
public class Flight extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_leg_id", nullable = false, unique = true)
    private RouteLeg routeLeg;

    @Column(nullable = false, length = 80)
    private String airline;

    @Column(nullable = false, length = 12)
    private String flightNo;

    @Column(length = 20)
    private String airWaybill;

    @Column(length = 40)
    private String aircraftType;

    private Short stallPositions;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private ServiceClass serviceClass;

    private Instant scheduledDepartureAt;

    private Instant scheduledArrivalAt;

    private Instant estimatedDepartureAt;

    private Instant estimatedArrivalAt;
}
