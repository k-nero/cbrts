package com.equifreight.repository;

import com.equifreight.entity.InsuranceClaim;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InsuranceClaimRepository extends JpaRepository<InsuranceClaim, UUID> {

    Optional<InsuranceClaim> findByIncident_Id(UUID incidentId);

    /** The claims on a request's jobs, oldest first, with their incident and job in one query. */
    @Query("""
            select c from InsuranceClaim c join fetch c.incident i join fetch i.job j
            where j.request.id = :requestId
            order by c.filedAt
            """)
    List<InsuranceClaim> findByRequestId(@Param("requestId") UUID requestId);
}
