package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * A vehicle on a trip, with its own load plan and crew. A convoy is a trip with several; seq orders them.
 */
@Setter
@Getter
@Entity
@Table(
        name = "trip_vehicles",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "trip_vehicles_trip_id_vehicle_id_key",
                    columnNames = {"trip_id", "vehicle_id"}),
            @UniqueConstraint(
                    name = "trip_vehicles_trip_id_seq_key",
                    columnNames = {"trip_id", "seq"})
        })
public class TripVehicle extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(nullable = false)
    private short seq;
}
