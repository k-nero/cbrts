package com.equifreight.repository;

import com.equifreight.entity.JobRegulationPin;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobRegulationPinRepository extends JpaRepository<JobRegulationPin, UUID> {

    long countByRegulationVersionId(UUID regulationVersionId);

    List<JobRegulationPin> findByRegulationVersionId(UUID regulationVersionId);

    List<JobRegulationPin> findByJobId(UUID jobId);
}
