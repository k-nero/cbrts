package com.equifreight.repository;

import com.equifreight.entity.TransportRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransportRequestRepository extends JpaRepository<TransportRequest, UUID> {
    Optional<TransportRequest> findByCode(String code);
}
