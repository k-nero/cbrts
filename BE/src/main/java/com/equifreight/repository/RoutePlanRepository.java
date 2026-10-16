package com.equifreight.repository;

import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.enums.RoutePlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoutePlanRepository extends JpaRepository<RoutePlan, UUID> {
    Optional<RoutePlan> findTopByJob_IdAndStatusOrderByVersionNoDesc(UUID jobId, RoutePlanStatus status);
}
