package com.equifreight.repository;

import com.equifreight.entity.TransportRequest;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransportRequestRepository extends JpaRepository<TransportRequest, UUID> {
    Optional<TransportRequest> findByCode(String code);
}
