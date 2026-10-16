package com.equifreight.repository;

import com.equifreight.entity.RequestHorse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

@Repository
public interface RequestHorseRepository extends JpaRepository<RequestHorse, RequestHorse.Key> {

    /** Of these horses, the ones that were ever on a request past DRAFT: their identity is locked (H-07). */
    @Query("select distinct rh.horse.id from RequestHorse rh where rh.horse.id in :horseIds"
            + " and rh.request.status <> com.equifreight.entity.enums.RequestStatus.DRAFT")
    Set<UUID> findHorseIdsOnSubmittedRequests(@Param("horseIds") Collection<UUID> horseIds);
}
