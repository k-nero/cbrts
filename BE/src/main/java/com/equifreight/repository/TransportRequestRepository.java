package com.equifreight.repository;

import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.RequestStatus;
import jakarta.persistence.LockModeType;
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

    Page<TransportRequest> findByClubId(UUID clubId, Pageable pageable);

    Page<TransportRequest> findByClubIdAndStatus(UUID clubId, RequestStatus status, Pageable pageable);

    /** How many horses each request carries, for one page of the list in one query. */
    @Query("select rh.request.id as requestId, count(rh) as horses from RequestHorse rh"
            + " where rh.request.id in :requestIds group by rh.request.id")
    List<HorseCount> countHorses(@Param("requestIds") Collection<UUID> requestIds);

    interface HorseCount {
        UUID getRequestId();

        long getHorses();
    }
}
