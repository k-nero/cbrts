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
    /** The trip's whole crew: every trailer's, and the flight's. */
    List<CrewAssignment> findByTrip_Id(UUID tripId);

    List<CrewAssignment> findByTripVehicle_Id(UUID tripVehicleId);

    @Modifying(flushAutomatically = true)
    @Query("delete from CrewAssignment c where c.tripVehicle.id = :tripVehicleId")
    void deleteByTripVehicleId(@Param("tripVehicleId") UUID tripVehicleId);

    /** Takes the trip's flight crew off (US-F3-15). */
    @Modifying(flushAutomatically = true)
    @Query("delete from CrewAssignment c where c.trip.id = :tripId and c.tripVehicle is null")
    void deleteFlightCrew(@Param("tripId") UUID tripId);

    /** The whole crew of a trip: when nobody rides it any more. */
    @Modifying(flushAutomatically = true)
    @Query("delete from CrewAssignment c where c.trip.id = :tripId")
    void deleteByTripId(@Param("tripId") UUID tripId);

    /**
     * The escort's upcoming and active trips (US-F4-01), one row per job's part on a trip they crew, with the trip's
     * code so the service can fold a shared trip into one row: closed jobs drop off the list, and so does a trip a
     * job's horses moved off (US-F5-06). A part is released to the crew once the logistics manager signs off its
     * trip (US-F3-08, US-F4-01).
     */
    @Query("""
            select new com.equifreight.model.trip.TripSummaryResponse(
                j.code, p.status, o.name, d.name,
                (select max(r.occurredAt) from TripRecord r where r.trip = t),
                t.code)
            from TransportJob j join j.request rq left join rq.originPlace o left join rq.destinationPlace d,
                 TripJob p join p.trip t
            where p.job = j
              and exists (select 1 from TripHorse th
                          where th.job = j and th.trip = t
                            and th.status <> com.equifreight.entity.enums.TripHorseStatus.MOVED)
              and exists (select 1 from CrewAssignment c where c.trip = t and c.user.id = :userId)
              and (p.signedOffAt is not null or p.status <> com.equifreight.entity.enums.TripStatus.NOT_STARTED)
              and j.stage <> com.equifreight.entity.enums.JobStage.CLOSED
            """)
    List<TripSummaryResponse> findTripRowsByUserId(@Param("userId") UUID userId, Sort sort);

    /** The user's crew places on a trip: the trailers they ride, and the flight. */
    List<CrewAssignment> findByTrip_IdAndUser_Id(UUID tripId, UUID userId);

    boolean existsByTrip_IdAndUser_Id(UUID tripId, UUID userId);

    /**
     * The user's assignments on other trips that still carry an open job, whatever their dates: the caller compares
     * each trip's own planned span, since a job travelling on a chain of trips (US-F3-16) spans all of them.
     */
    @Query("""
            select c from CrewAssignment c
            where c.user.id = :userId
              and c.trip.id <> :tripId
              and exists (
                  select 1 from TripHorse th join th.job j
                  where th.trip = c.trip
                    and j.stage <> com.equifreight.entity.enums.JobStage.CLOSED)
            """)
    List<CrewAssignment> findOnOtherOpenTrips(@Param("userId") UUID userId, @Param("tripId") UUID tripId);
}
