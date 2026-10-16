package com.equifreight.repository;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransportJobRepository extends JpaRepository<TransportJob, UUID>,
        JpaSpecificationExecutor<TransportJob> {

    Optional<TransportJob> findByCode(String code);

    Optional<TransportJob> findByRequestId(UUID requestId);

    List<TransportJob> findByDossierStatus(DossierStatus dossierStatus);

    List<TransportJob> findByStage(JobStage stage);

    /** Jobs whose dossier is still being worked (not departed), for the specialist's job picker; q matches code or club. */
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
}
