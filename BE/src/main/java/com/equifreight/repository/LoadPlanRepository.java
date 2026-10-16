package com.equifreight.repository;

import com.equifreight.entity.LoadPlan;
import com.equifreight.entity.enums.LoadPlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoadPlanRepository extends JpaRepository<LoadPlan, UUID> {
    List<LoadPlan> findByJobId(UUID jobId);
    Optional<LoadPlan> findByJobIdAndStatus(UUID jobId, LoadPlanStatus status);
    Optional<LoadPlan> findFirstByJobIdOrderByCreatedAtDesc(UUID jobId);
}
