package com.equifreight.repository;

import com.equifreight.entity.JobCharge;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobChargeRepository extends JpaRepository<JobCharge, UUID> {

    List<JobCharge> findByJob_IdOrderByCreatedAt(UUID jobId);

    Optional<JobCharge> findByIncident_Id(UUID incidentId);
}
