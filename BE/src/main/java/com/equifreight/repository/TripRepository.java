package com.equifreight.repository;

import com.equifreight.entity.Trip;
import java.util.List;
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

    /**
     * Trips a job on {@code corridorId} could join (US-F3-18): their route confirmed, not departed, other than
     * {@code exceptId}, soonest first.
     */
    @Query("""
            select t from Trip t
            where t.corridor.id = :corridorId
              and t.id <> :exceptId
              and t.status = com.equifreight.entity.enums.TripStatus.NOT_STARTED
              and exists (select 1 from RoutePlan rp
                          where rp.trip = t and rp.status = com.equifreight.entity.enums.RoutePlanStatus.CONFIRMED)
            order by t.plannedDepartureAt asc nulls last, t.code
            """)
    List<Trip> findJoinable(@Param("corridorId") UUID corridorId, @Param("exceptId") UUID exceptId);

    /**
     * Deletes a trip nobody rides any more (US-F3-21): its vehicles, horses, parts, route, load plans, bookings and crew
     * go with it, by the database's cascades.
     */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Trip t where t.id = :id")
    void deleteTrip(@Param("id") UUID id);
}
