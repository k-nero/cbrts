package com.equifreight.repository;

import com.equifreight.entity.CrewAssignment;
import com.equifreight.model.trip.TripSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CrewAssignmentRepository extends JpaRepository<CrewAssignment, CrewAssignment.Key> {
    @Query(value = """
            select new com.equifreight.model.trip.TripSummaryResponse(
                c.job.code, c.job.tripStatus, c.job.request.originPlace.name, c.job.request.destinationPlace.name,
                (select max(r.occurredAt) from TripRecord r where r.job.id = c.job.id))
            from CrewAssignment c where c.user.id = :userId
            """,
            countQuery = "select count(c) from CrewAssignment c where c.user.id = :userId")
    Page<TripSummaryResponse> findTripSummariesByUserId(@Param("userId") UUID userId, Pageable pageable);

    boolean existsByJob_IdAndUser_Id(UUID jobId, UUID userId);

}
