package com.equifreight.repository;

import com.equifreight.entity.LoadPlan;
import com.equifreight.entity.enums.LoadPlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LoadPlanRepository extends JpaRepository<LoadPlan, UUID> {
    Optional<LoadPlan> findTopByJob_IdAndStatusOrderByConfirmedAtDesc(UUID jobId, LoadPlanStatus status);
}
