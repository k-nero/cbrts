package com.equifreight.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * The flight of an air leg. The airline owns the times, so scheduled and latest estimated times are kept apart;
 * actual times come from trip records. Every job on the trip flies on it, each with its own allocation (US-F3-15).
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

    @Column(length = 40)
    private String aircraftType;

    /** The stall positions the airline gives the trip on this flight; null until known. */
    private Short stallCapacity;

    /** One consignment per job on the trip (US-F3-15). */
    @OneToMany(mappedBy = "flight", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt")
    private List<FlightAllocation> allocations = new ArrayList<>();

    private Instant scheduledDepartureAt;

    private Instant scheduledArrivalAt;

    private Instant estimatedDepartureAt;

    private Instant estimatedArrivalAt;
}
