package com.equifreight.repository;

import com.equifreight.entity.TransportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface TransportJobRepository extends JpaRepository<TransportJob, UUID>, JpaSpecificationExecutor<TransportJob> {
    Optional<TransportJob> findByCode(String code);
    Optional<TransportJob> findByRequestId(UUID requestId);
}
