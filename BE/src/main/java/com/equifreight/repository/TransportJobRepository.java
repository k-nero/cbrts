package com.equifreight.repository;

import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.JobStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
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
}
