package com.equifreight.repository;

import com.equifreight.entity.TransportJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface TransportJobRepository extends JpaRepository<TransportJob, UUID> {
    Optional<TransportJob> findByCode(String code);

    @Query("select j from TransportJob j where j.request.club.id = :clubId")
    Page<TransportJob> findAllByClubId(@Param("clubId") UUID clubId, Pageable pageable);

    @Query("select j from TransportJob j where j.stage = com.equifreight.entity.enums.JobStage.TRIP")
    Page<TransportJob> findActiveTrips(Pageable pageable);
}
