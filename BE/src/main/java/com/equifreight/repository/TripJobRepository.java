package com.equifreight.repository;

import com.equifreight.entity.TripJob;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripJobRepository extends JpaRepository<TripJob, UUID> {

    Optional<TripJob> findByTrip_IdAndJob_Id(UUID tripId, UUID jobId);

    List<TripJob> findByJob_IdOrderByCreatedAt(UUID jobId);

    List<TripJob> findByTrip_Id(UUID tripId);
}
