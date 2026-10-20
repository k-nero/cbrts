package com.equifreight.repository;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.model.trip.TripSummaryResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CrewAssignmentRepository extends JpaRepository<CrewAssignment, CrewAssignment.Key> {
    List<CrewAssignment> findByJobId(UUID jobId);

    void deleteByJobId(UUID jobId);

    /**
     * The escort's upcoming and active trips (US-F4-01): closed jobs drop off the list.
     * Trips are only released to the crew once signed off by the logistics manager (US-F3-08, US-F4-01).
     */
    @Query(value = """
            select new com.equifreight.model.trip.TripSummaryResponse(
                j.code, j.tripStatus, o.name, d.name,
                (select max(r.occurredAt) from TripRecord r where r.job = j))
            from CrewAssignment c join c.job j join j.request rq left join rq.originPlace o left join rq.destinationPlace d
            where c.user.id = :userId and j.signedOffAt is not null and j.stage <> com.equifreight.entity.enums.JobStage.CLOSED
            """, countQuery = """
                    select count(c) from CrewAssignment c join c.job j
                    where c.user.id = :userId and j.signedOffAt is not null and j.stage <> com.equifreight.entity.enums.JobStage.CLOSED
                    """)
    Page<TripSummaryResponse> findTripSummariesByUserId(@Param("userId") UUID userId, Pageable pageable);

    boolean existsByJob_IdAndUser_Id(UUID jobId, UUID userId);

    @Query("""
            select c from CrewAssignment c join c.job j
            where c.user.id = :userId
              and j.id <> :jobId
              and j.stage <> com.equifreight.entity.enums.JobStage.CLOSED
              and j.plannedDepartureAt is not null
              and j.plannedArrivalAt is not null
              and j.plannedDepartureAt < :jobEnd
              and j.plannedArrivalAt > :jobStart
            """)
    List<CrewAssignment> findOverlappingAssignments(
            @Param("userId") UUID userId,
            @Param("jobId") UUID jobId,
            @Param("jobStart") java.time.Instant jobStart,
            @Param("jobEnd") java.time.Instant jobEnd);
}
