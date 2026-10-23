package com.equifreight.repository;

import com.equifreight.entity.Trip;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripRepository extends JpaRepository<Trip, UUID> {

    /**
     * The trip a job's horses are on now; once they have arrived, the trip they arrived on. Before departure every
     * horse of a job is on the same trip.
     */
    @Query("""
            select th.trip from TripHorse th
            where th.job.id = :jobId
            order by case when th.status = com.equifreight.entity.enums.TripHorseStatus.ON_TRIP then 0 else 1 end,
                     th.createdAt desc
            limit 1
            """)
    Optional<Trip> findCurrentByJobId(@Param("jobId") UUID jobId);
}
