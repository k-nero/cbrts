package com.equifreight.entity;

import com.equifreight.entity.enums.TripHorseStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Which horse of which job rides which trip. A job's horse is ON_TRIP on one trip at a time (partial unique index); a
 * horse moved by an incident keeps its old row as MOVED. The horse belongs to the job's request, and before departure
 * all of a job's horses are on one trip; both are checked by the application.
 */
@Setter
@Getter
@Entity
@Table(
        name = "trip_horses",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "trip_horses_trip_id_horse_id_key",
                        columnNames = {"trip_id", "horse_id"}))
public class TripHorse extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "horse_id", nullable = false)
    private Horse horse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TripHorseStatus status = TripHorseStatus.ON_TRIP;
}
