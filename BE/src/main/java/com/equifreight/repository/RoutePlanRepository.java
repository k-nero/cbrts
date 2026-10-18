package com.equifreight.repository;

import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.enums.RoutePlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoutePlanRepository extends JpaRepository<RoutePlan, UUID> {
    List<RoutePlan> findByJobIdOrderByVersionNoDesc(UUID jobId);

    Optional<RoutePlan> findByJobIdAndStatus(UUID jobId, RoutePlanStatus status);

    Optional<RoutePlan> findFirstByJobIdOrderByVersionNoDesc(UUID jobId);

    Optional<RoutePlan> findByJobIdAndVersionNo(UUID jobId, short versionNo);

    Optional<RoutePlan> findTopByJob_IdAndStatusOrderByVersionNoDesc(UUID jobId, RoutePlanStatus status);
}
