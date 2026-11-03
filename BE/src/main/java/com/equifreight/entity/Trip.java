package com.equifreight.entity;

import com.equifreight.entity.enums.TripStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * What physically moves: a route, one or more vehicles with their crews, and the horses of one or more jobs
 * (docs/shared-trips-design.md). The job stays the commercial and legal unit. A job that shares nothing is a trip
 * with one job and one vehicle. All of a trip's jobs share its corridor.
 */
@Setter
@Getter
@Entity
@Table(name = "trips")
public class Trip extends BaseEntity {

    /**
     * TRP-2026-014. Staff and the crew see it; customers never do.
     */
    @Column(nullable = false, unique = true, length = 14)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corridor_id", nullable = false)
    private Corridor corridor;

    /**
     * The trip runs its corridor from the destination city to the origin city (US-F3-21): a road corridor is driven
     * either way, and a trip shared by several jobs runs one way only, so its direction is the trip's, not a job's.
     */
    @Column(nullable = false)
    private boolean reversed;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TripStatus status = TripStatus.NOT_STARTED;

    /**
     * Set by the confirmed route's first pickup.
     */
    private Instant plannedDepartureAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("seq")
    private List<TripVehicle> vehicles = new ArrayList<>();

    @OneToMany(mappedBy = "trip")
    private List<TripHorse> horses = new ArrayList<>();

    /** The city the trip leaves from, its corridor read in the trip's direction (US-F3-21). */
    public String startCity() {
        return reversed ? corridor.getDestinationCity() : corridor.getOriginCity();
    }

    /** The city the trip ends in, its corridor read in the trip's direction (US-F3-21). */
    public String endCity() {
        return reversed ? corridor.getOriginCity() : corridor.getDestinationCity();
    }

    /** The jobs with horses on this trip, in the order their horses joined it. */
    public List<TransportJob> getJobs() {
        return horses.stream().map(TripHorse::getJob).distinct().toList();
    }
}
