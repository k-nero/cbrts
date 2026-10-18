package com.equifreight.repository;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.model.trip.TripSummaryResponse;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransportJobRepository extends JpaRepository<TransportJob, UUID>,
        JpaSpecificationExecutor<TransportJob> {

    Optional<TransportJob> findByCode(String code);

    List<TransportJob> findByCodeIn(Collection<String> codes);

    Optional<TransportJob> findByRequestId(UUID requestId);

    List<TransportJob> findByDossierStatus(DossierStatus dossierStatus);

    List<TransportJob> findByStage(JobStage stage);

    /**
     * Jobs whose dossier is still being worked (not departed), for the specialist's job picker; q matches code or club.
     */
    @Query(value = """
            select j from TransportJob j join fetch j.request r join fetch r.club c
            where j.departedAt is null
              and (:q = '' or lower(j.code) like lower(concat('%', :q, '%')) or lower(c.name) like lower(concat('%', :q, '%')))
            """,
            countQuery = """
                    select count(j) from TransportJob j join j.request r join r.club c
                    where j.departedAt is null
                      and (:q = '' or lower(j.code) like lower(concat('%', :q, '%')) or lower(c.name) like lower(concat('%', :q, '%')))
                    """)
    Page<TransportJob> findOpenDossiers(@Param("q") String q, Pageable pageable);


    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from TransportJob j where j.code = :code")
    Optional<TransportJob> findByCodeForUpdate(@Param("code") String code);

    /**
     * Origin and destination are optional on a request, so they are left-joined: a job without them still lists.
     */
    @Query(value = """
            select new com.equifreight.model.trip.TripSummaryResponse(
                j.code, j.tripStatus, o.name, d.name,
                (select max(r.occurredAt) from TripRecord r where r.job = j))
            from TransportJob j join j.request rq left join rq.originPlace o left join rq.destinationPlace d
            where rq.club.id = :clubId
            """,
            countQuery = "select count(j) from TransportJob j where j.request.club.id = :clubId")
    Page<TripSummaryResponse> findAllByClubId(@Param("clubId") UUID clubId, Pageable pageable);

    /**
     * Origin and destination are optional on a request, so they are left-joined: a job without them still lists.
     */
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
