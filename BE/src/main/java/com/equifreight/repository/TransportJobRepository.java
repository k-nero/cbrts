package com.equifreight.repository;

import com.equifreight.entity.TransportJob;
import com.equifreight.model.trip.TripSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface TransportJobRepository extends JpaRepository<TransportJob, UUID> {
    Optional<TransportJob> findByCode(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from TransportJob j where j.code = :code")
    Optional<TransportJob> findByCodeForUpdate(@Param("code") String code);

    /** Origin and destination are optional on a request, so they are left-joined: a job without them still lists. */
    @Query(value = """
            select new com.equifreight.model.trip.TripSummaryResponse(
                j.code, j.tripStatus, o.name, d.name,
                (select max(r.occurredAt) from TripRecord r where r.job = j))
            from TransportJob j join j.request rq left join rq.originPlace o left join rq.destinationPlace d
            where rq.club.id = :clubId
            """,
            countQuery = "select count(j) from TransportJob j where j.request.club.id = :clubId")
    Page<TripSummaryResponse> findAllByClubId(@Param("clubId") UUID clubId, Pageable pageable);

    /** Origin and destination are optional on a request, so they are left-joined: a job without them still lists. */
    @Query(value = """
            select new com.equifreight.model.trip.TripSummaryResponse(
                j.code, j.tripStatus, o.name, d.name,
                (select max(r.occurredAt) from TripRecord r where r.job = j))
            from TransportJob j join j.request rq left join rq.originPlace o left join rq.destinationPlace d
            where j.stage in (com.equifreight.entity.enums.JobStage.CLEARANCE,
                              com.equifreight.entity.enums.JobStage.TRIP,
                              com.equifreight.entity.enums.JobStage.HANDOVER)
            """,
            countQuery = """
                    select count(j) from TransportJob j
                    where j.stage in (com.equifreight.entity.enums.JobStage.CLEARANCE,
                                      com.equifreight.entity.enums.JobStage.TRIP,
                                      com.equifreight.entity.enums.JobStage.HANDOVER)
                    """)
    Page<TripSummaryResponse> findActiveTrips(Pageable pageable);
}
