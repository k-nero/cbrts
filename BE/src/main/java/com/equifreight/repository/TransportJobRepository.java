package com.equifreight.repository;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import com.equifreight.model.trip.TripSummaryResponse;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TransportJobRepository
        extends JpaRepository<TransportJob, UUID>, JpaSpecificationExecutor<TransportJob> {

    Optional<TransportJob> findByCode(String code);

    List<TransportJob> findByCodeIn(Collection<String> codes);

    Optional<TransportJob> findByRequestId(UUID requestId);

    List<TransportJob> findByRequestIdIn(Collection<UUID> requestIds);

    boolean existsByRequestId(UUID requestId);

    /** Open jobs (not closed) per transport specialist, for the approval's team choice (US-F1-07). */
    @Query("""
            select j.transportSpecialist.id as userId, count(j) as jobs from TransportJob j
            where j.closedAt is null and j.transportSpecialist.id in :ids
            group by j.transportSpecialist.id
            """)
    List<UserJobCount> countOpenBySpecialist(@Param("ids") Collection<UUID> ids);

    /** Open jobs (not closed) per fleet & route coordinator. */
    @Query("""
            select j.coordinator.id as userId, count(j) as jobs from TransportJob j
            where j.closedAt is null and j.coordinator.id in :ids
            group by j.coordinator.id
            """)
    List<UserJobCount> countOpenByCoordinator(@Param("ids") Collection<UUID> ids);

    List<TransportJob> findByDossierStatus(DossierStatus dossierStatus);

    List<TransportJob> findByStage(JobStage stage);

    /**
     * Jobs whose dossier is still being worked (not departed), for the specialist's job picker; q matches code or club.
     */
    @Query(value = """
            select j from TransportJob j join fetch j.request r join fetch r.club c
            where j.departedAt is null
              and (:q = '' or lower(j.code) like lower(concat('%', :q, '%')) or lower(c.name) like lower(concat('%', :q, '%')))
            """, countQuery = """
                    select count(j) from TransportJob j join j.request r join r.club c
                    where j.departedAt is null
                      and (:q = '' or lower(j.code) like lower(concat('%', :q, '%')) or lower(c.name) like lower(concat('%', :q, '%')))
                    """)
    Page<TransportJob> findOpenDossiers(@Param("q") String q, Pageable pageable);

    /**
     * Jobs that could share a trailer on {@code corridorId} (US-F3-11): approved, not departed, not closed, and the
     * customer chose a shared trailer. Earliest departure first.
     */
    @Query("""
            select j from TransportJob j join j.request r
            where r.corridor.id = :corridorId
              and r.trailer = com.equifreight.entity.enums.TrailerType.SHARED
              and j.departedAt is null
              and j.tripStatus = com.equifreight.entity.enums.TripStatus.NOT_STARTED
              and j.stage <> com.equifreight.entity.enums.JobStage.CLOSED
            order by r.departureDate, j.code
            """)
    List<TransportJob> findShareCandidates(@Param("corridorId") UUID corridorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from TransportJob j where j.code = :code")
    Optional<TransportJob> findByCodeForUpdate(@Param("code") String code);

    /**
     * Origin and destination are optional on a request, so they are left-joined: a job without them still lists.
     */
    @Query(value = """
            select new com.equifreight.model.trip.TripSummaryResponse(
                j.code, j.tripStatus, o.name, d.name,
                (select max(r.occurredAt) from TripRecord r
                 where r.trip.id in (select th.trip.id from TripHorse th where th.job = j)))
            from TransportJob j join j.request rq left join rq.originPlace o left join rq.destinationPlace d
            where rq.club.id = :clubId
            """, countQuery = "select count(j) from TransportJob j where j.request.club.id = :clubId")
    Page<TripSummaryResponse> findAllByClubId(@Param("clubId") UUID clubId, Pageable pageable);

    /**
     * Origin and destination are optional on a request, so they are left-joined: a job without them still lists.
     */
    @Query(value = """
            select new com.equifreight.model.trip.TripSummaryResponse(
                j.code, j.tripStatus, o.name, d.name,
                (select max(r.occurredAt) from TripRecord r
                 where r.trip.id in (select th.trip.id from TripHorse th where th.job = j)))
            from TransportJob j join j.request rq left join rq.originPlace o left join rq.destinationPlace d
            where j.stage in (com.equifreight.entity.enums.JobStage.CLEARANCE,
                              com.equifreight.entity.enums.JobStage.TRIP,
                              com.equifreight.entity.enums.JobStage.HANDOVER)
            """, countQuery = """
                    select count(j) from TransportJob j
                    where j.stage in (com.equifreight.entity.enums.JobStage.CLEARANCE,
                                      com.equifreight.entity.enums.JobStage.TRIP,
                                      com.equifreight.entity.enums.JobStage.HANDOVER)
                    """)
    Page<TripSummaryResponse> findActiveTrips(Pageable pageable);

    /** Jobs delivered in a period, with their club and corridor, optionally on one corridor (US-R-03). */
    @Query("""
            select j from TransportJob j join fetch j.request r join fetch r.club left join fetch r.corridor c
            where j.deliveredAt >= :from and j.deliveredAt < :to and (:corridor is null or c.id = :corridor)
            order by j.deliveredAt
            """)
    List<TransportJob> findDeliveredBetween(
            @Param("from") java.time.Instant from, @Param("to") java.time.Instant to, @Param("corridor") UUID corridor);
}
