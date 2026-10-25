package com.equifreight.repository;

import com.equifreight.entity.JobRegulationPin;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface JobRegulationPinRepository extends JpaRepository<JobRegulationPin, UUID> {

    long countByRegulationVersionId(UUID regulationVersionId);

    /**
     * How many jobs are pinned to each regulation version, for the catalog list (versions with none are absent).
     */
    @Query("select p.regulationVersion.id as versionId, count(p) as pinned from JobRegulationPin p"
            + " group by p.regulationVersion.id")
    List<VersionPinCount> countPinsByVersion();

    interface VersionPinCount {
        UUID getVersionId();

        long getPinned();
    }

    List<JobRegulationPin> findByRegulationVersionId(UUID regulationVersionId);

    List<JobRegulationPin> findByJobId(UUID jobId);
}
