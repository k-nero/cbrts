package com.equifreight.repository;

import com.equifreight.entity.QuarantinePeriod;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface QuarantinePeriodRepository
        extends JpaRepository<QuarantinePeriod, UUID>, JpaSpecificationExecutor<QuarantinePeriod> {

    /**
     * Every quarantine of a job.
     */
    List<QuarantinePeriod> findByJobId(UUID jobId);

    /**
     * A horse's quarantines within a job.
     */
    List<QuarantinePeriod> findByJobIdAndHorseId(UUID jobId, UUID horseId);

    /**
     * Whether every quarantine of the job is completed (completedAt is set).
     */
    @Query("""
            SELECT COUNT(q) = 0 FROM QuarantinePeriod q
            WHERE q.job.id = :jobId AND q.completedAt IS NULL
            """)
    boolean areAllQuarantinesCompleted(@Param("jobId") UUID jobId);

    /**
     * The quarantines held at a place (a quarantine station).
     */
    List<QuarantinePeriod> findByPlaceId(UUID placeId);

    /**
     * The job's quarantines at a station that are not completed yet.
     */
    List<QuarantinePeriod> findByJobIdAndPlaceIdAndCompletedAtIsNull(UUID jobId, UUID placeId);

    /**
     * The job's quarantines that are not completed yet, with their stations.
     */
    @EntityGraph(attributePaths = "place")
    List<QuarantinePeriod> findByJobIdAndCompletedAtIsNullOrderByStartsOn(UUID jobId);

    boolean existsByPlaceId(UUID placeId);
}
