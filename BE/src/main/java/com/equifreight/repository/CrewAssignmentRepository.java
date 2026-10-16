package com.equifreight.repository;

import com.equifreight.entity.CrewAssignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CrewAssignmentRepository extends JpaRepository<CrewAssignment, CrewAssignment.Key> {
    Page<CrewAssignment> findByUser_Id(UUID userId, Pageable pageable);

    boolean existsByJob_IdAndUser_Id(UUID jobId, UUID userId);
}
