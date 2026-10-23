package com.equifreight.repository;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.model.trip.TripSummaryResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CrewAssignmentRepository extends JpaRepository<CrewAssignment, UUID> {
    /** The crew of every vehicle on the trip. */
    List<CrewAssignment> findByTripVehicle_Trip_Id(UUID tripId);

    List<CrewAssignment> findByTripVehicle_Id(UUID tripVehicleId);

    @Modifying(flushAutomatically = true)
    @Query("delete from CrewAssignment c where c.tripVehicle.id = :tripVehicleId")
    void deleteByTripVehicleId(@Param("tripVehicleId") UUID tripVehicleId);

    /**
     * The escort's upcoming and active trips (US-F4-01), one row per job on a trip they crew, with the trip's code so
     * the service can fold a shared trip into one row: closed jobs drop off the list. Trips are only released to the
     * crew once signed off by the logistics manager (US-F3-08, US-F4-01).
     */
    @Query("""
            select new com.equifreight.model.trip.TripSummaryResponse(
                j.code, j.tripStatus, o.name, d.name,
                (select max(r.occurredAt) from TripRecord r where r.trip = t),
                t.code)
            from TransportJob j join j.request rq left join rq.originPlace o left join rq.destinationPlace d,
                 Trip t
            where t.id in (select th.trip.id from TripHorse th where th.job = j)
              and exists (select 1 from CrewAssignment c where c.tripVehicle.trip = t and c.user.id = :userId)
              and (j.signedOffAt is not null or j.tripStatus <> com.equifreight.entity.enums.TripStatus.NOT_STARTED)
              and j.stage <> com.equifreight.entity.enums.JobStage.CLOSED
            """)
    List<TripSummaryResponse> findTripRowsByUserId(@Param("userId") UUID userId, Sort sort);

    /** The user's crew places on a trip: the trailers they ride. */
    List<CrewAssignment> findByTripVehicle_Trip_IdAndUser_Id(UUID tripId, UUID userId);

    boolean existsByTripVehicle_Trip_IdAndUser_Id(UUID tripId, UUID userId);

    /**
     * The user's assignments on other trips that carry a job travelling between {@code start} and {@code end}.
     */
    @Query("""
            select c from CrewAssignment c
            where c.user.id = :userId
              and c.tripVehicle.trip.id <> :tripId
              and exists (
                  select 1 from TripHorse th join th.job j
                  where th.trip = c.tripVehicle.trip
                    and j.stage <> com.equifreight.entity.enums.JobStage.CLOSED
                    and j.plannedDepartureAt is not null
                    and j.plannedArrivalAt is not null
                    and j.plannedDepartureAt < :end
                    and j.plannedArrivalAt > :start)
            """)
    List<CrewAssignment> findOverlappingAssignments(
            @Param("userId") UUID userId,
            @Param("tripId") UUID tripId,
            @Param("start") java.time.Instant start,
            @Param("end") java.time.Instant end);
}
