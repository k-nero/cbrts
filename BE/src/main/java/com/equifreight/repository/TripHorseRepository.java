package com.equifreight.repository;

import com.equifreight.entity.TripHorse;
import com.equifreight.entity.enums.TripHorseStatus;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripHorseRepository extends JpaRepository<TripHorse, UUID> {

    List<TripHorse> findByTrip_IdAndJob_IdAndStatus(UUID tripId, UUID jobId, TripHorseStatus status);

    List<TripHorse> findByTrip_IdAndStatusOrderByCreatedAt(UUID tripId, TripHorseStatus status);

    List<TripHorse> findByTrip_IdAndStatusInOrderByCreatedAt(UUID tripId, Collection<TripHorseStatus> statuses);

    List<TripHorse> findByTrip_IdAndJob_IdAndStatusIn(UUID tripId, UUID jobId, Collection<TripHorseStatus> statuses);

    List<TripHorse> findByTrip_IdOrderByCreatedAt(UUID tripId);

    /** Every row of the job's horses, on every trip, oldest first. */
    List<TripHorse> findByJob_IdOrderByCreatedAt(UUID jobId);
}
