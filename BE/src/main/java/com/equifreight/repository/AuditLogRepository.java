package com.equifreight.repository;

import com.equifreight.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository for append-only audit log records (BR-F1-08 / AGENTS.md).
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findByEntityCodeOrderByOccurredAtDesc(String entityCode, Pageable pageable);

    Page<AuditLog> findByEntityTypeOrderByOccurredAtDesc(String entityType, Pageable pageable);
}
