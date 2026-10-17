package com.equifreight.repository;

import com.equifreight.entity.TransportRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TransportRequestRepository extends JpaRepository<TransportRequest, UUID> {
    Optional<TransportRequest> findByCode(String code);
}
