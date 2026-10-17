package com.equifreight.repository;

import com.equifreight.entity.LoadPlan;
import com.equifreight.entity.enums.LoadPlanStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoadPlanRepository extends JpaRepository<LoadPlan, UUID> {
    List<LoadPlan> findByJobId(UUID jobId);
    Optional<LoadPlan> findByJobIdAndStatus(UUID jobId, LoadPlanStatus status);
    Optional<LoadPlan> findFirstByJobIdOrderByCreatedAtDesc(UUID jobId);
    Optional<LoadPlan> findTopByJob_IdAndStatusOrderByConfirmedAtDesc(UUID jobId, LoadPlanStatus status);

    /**
     * The job's current plan, row-locked until the transaction ends. Every change to the placements
     * takes this lock first, so two coordinators editing the same plan are applied one after the
     * other and the second one's preconditions are checked against the first one's result.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from LoadPlan p where p.job.id = :jobId order by p.createdAt desc limit 1")
    Optional<LoadPlan> findLatestByJobIdForUpdate(@Param("jobId") UUID jobId);
}
