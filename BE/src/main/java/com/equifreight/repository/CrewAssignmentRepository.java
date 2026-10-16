package com.equifreight.repository;

import com.equifreight.entity.CrewAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CrewAssignmentRepository extends JpaRepository<CrewAssignment, CrewAssignment.Key> {
    List<CrewAssignment> findByJobId(UUID jobId);
    void deleteByJobId(UUID jobId);
}
