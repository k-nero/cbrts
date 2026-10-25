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
     * horse of a job is on the same trip; a later trip of the job's chain, where they are only planned, is never the
     * current one (US-F3-16).
     */
    @Query("""
            select th.trip from TripHorse th
            where th.job.id = :jobId
            order by case th.status
                         when com.equifreight.entity.enums.TripHorseStatus.ON_TRIP then 0
                         when com.equifreight.entity.enums.TripHorseStatus.DELIVERED then 1
                         when com.equifreight.entity.enums.TripHorseStatus.LEFT_IN_CARE then 1
                         else 2 end,
                     th.createdAt desc
            limit 1
            """)
    Optional<Trip> findCurrentByJobId(@Param("jobId") UUID jobId);
}
