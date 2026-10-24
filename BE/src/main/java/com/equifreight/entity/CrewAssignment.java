package com.equifreight.entity;

import com.equifreight.entity.enums.CrewRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * One person on the crew of a trip: on one of its trailers, or on its flight. Grooms = ⌈horses ÷ 3⌉ is checked by the
 * application.
 */
@Setter
@Getter
@Entity
@Table(
        name = "crew_assignments",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "crew_assignments_trip_vehicle_id_user_id_key",
                        columnNames = {"trip_vehicle_id", "user_id"}))
public class CrewAssignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    /** The trailer this person rides; null for the trip's flight crew (flying grooms and the flight vet, US-F3-15). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_vehicle_id")
    private TripVehicle tripVehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CrewRole crewRole;
}
