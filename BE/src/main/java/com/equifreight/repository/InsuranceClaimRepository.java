package com.equifreight.repository;

import com.equifreight.entity.InsuranceClaim;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InsuranceClaimRepository extends JpaRepository<InsuranceClaim, UUID> {

    Optional<InsuranceClaim> findByIncident_Id(UUID incidentId);
}
