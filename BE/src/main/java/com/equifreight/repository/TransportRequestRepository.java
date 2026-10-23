package com.equifreight.repository;

import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.RequestStatus;
import com.equifreight.entity.enums.TransportMode;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TransportRequestRepository extends JpaRepository<TransportRequest, UUID> {

    Optional<TransportRequest> findByCode(String code);

    /** Scoped to the club: another club's request is never found. */
    Optional<TransportRequest> findByIdAndClubId(UUID id, UUID clubId);

    /**
     * The same, holding the row lock until the transaction ends, so an edit, a discard and a submit of one
     * request never interleave (a double-clicked submit can't issue two codes).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from TransportRequest r where r.id = :id and r.club.id = :clubId")
    Optional<TransportRequest> findForUpdate(@Param("id") UUID id, @Param("clubId") UUID clubId);

    /** Staff read any club's request; the same row lock as {@link #findForUpdate}. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from TransportRequest r where r.id = :id")
    Optional<TransportRequest> findByIdForUpdate(@Param("id") UUID id);

    Page<TransportRequest> findByClubId(UUID clubId, Pageable pageable);

    Page<TransportRequest> findByClubIdAndStatus(UUID clubId, RequestStatus status, Pageable pageable);

    /**
     * The review queue (US-F1-03, US-F1-07): requests waiting for review or approval, oldest first by when they entered the queue,
     * which is their latest version's submission. The order is fixed, so the derived columns are never sorted
     * by the client.
     */
    @Query(
            value =
                    "select r.id as id, r.code as code, r.status as status, c.name as club, o.city as fromCity, d.city as toCity,"
                            + " r.mode as mode, (select count(rh) from RequestHorse rh where rh.request = r) as horseCount,"
                            + " r.departureDate as departureDate, r.dateFlexDays as dateFlexDays,"
                            + " max(v.submittedAt) as waitingSince, max(v.revisionNo) as revisionNo"
                            + " from RequestRevision v join v.request r join r.club c"
                            + " left join r.originPlace o left join r.destinationPlace d"
                            + " where r.status in :statuses"
                            + " group by r.id, r.code, r.status, c.name, o.city, d.city, r.mode, r.departureDate,"
                            + " r.dateFlexDays"
                            + " order by max(v.submittedAt) asc, r.code asc",
            countQuery = "select count(distinct r) from RequestRevision v join v.request r where r.status in :statuses")
    Page<QueueRow> findQueue(@Param("statuses") Collection<RequestStatus> statuses, Pageable pageable);

    /** The same queue, ids only and in the same order, for "3 of 4" and the next request. */
    @Query("select r.id from RequestRevision v join v.request r where r.status in :statuses"
            + " group by r.id, r.code order by max(v.submittedAt) asc, r.code asc")
    List<UUID> findQueueIds(@Param("statuses") Collection<RequestStatus> statuses);

    interface QueueRow {
        UUID getId();

        String getCode();

        RequestStatus getStatus();

        String getClub();

        String getFromCity();

        String getToCity();

        TransportMode getMode();

        Number getHorseCount();

        LocalDate getDepartureDate();

        Number getDateFlexDays();

        Instant getWaitingSince();

        Number getRevisionNo();
    }

    /** How many horses each request carries, for one page of the list in one query. */
    @Query("select rh.request.id as requestId, count(rh) as horses from RequestHorse rh"
            + " where rh.request.id in :requestIds group by rh.request.id")
    List<HorseCount> countHorses(@Param("requestIds") Collection<UUID> requestIds);

    interface HorseCount {
        UUID getRequestId();

        long getHorses();
    }
}
