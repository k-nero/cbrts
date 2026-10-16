package com.equifreight.repository;

import com.equifreight.entity.RequestHorse;
import com.equifreight.entity.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RequestHorseRepository extends JpaRepository<RequestHorse, RequestHorse.Key> {

    /**
     * Of these horses, the ones that were ever on a submitted request: their identity is locked (H-07),
     * whatever happened to the request afterwards.
     */
    @Query("select distinct rh.horse.id from RequestHorse rh where rh.horse.id in :horseIds"
            + " and rh.request.submittedAt is not null")
    Set<UUID> findHorseIdsOnSubmittedRequests(@Param("horseIds") Collection<UUID> horseIds);

    /** Codes of the submitted requests the horse was on, newest first; the lock message names the first. */
    @Query("select r.code from RequestHorse rh join rh.request r where rh.horse.id = :horseId"
            + " and r.submittedAt is not null order by r.submittedAt desc")
    List<String> findSubmittedRequestCodes(@Param("horseId") UUID horseId);

    /**
     * What stops the horse from being archived (H-08): a request in one of the active statuses, or an
     * approved request whose job has not closed. Newest first.
     */
    @Query("select r.code as code, r.status as status from RequestHorse rh join rh.request r"
            + " where rh.horse.id = :horseId and (r.status in :activeStatuses"
            + " or (r.status = com.equifreight.entity.enums.RequestStatus.APPROVED and exists"
            + " (select j.id from TransportJob j where j.request = r"
            + " and j.stage <> com.equifreight.entity.enums.JobStage.CLOSED)))"
            + " order by r.createdAt desc")
    List<HorseUse> findActiveUses(@Param("horseId") UUID horseId,
                                  @Param("activeStatuses") Collection<RequestStatus> activeStatuses);

    interface HorseUse {
        String getCode();

        RequestStatus getStatus();
    }

    List<RequestHorse> findByRequest_Id(UUID requestId);

    boolean existsByRequest_IdAndHorse_Id(UUID requestId, UUID horseId);

    Optional<RequestHorse> findByRequest_IdAndHorse_Id(UUID requestId, UUID horseId);
}
