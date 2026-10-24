package com.equifreight.repository;

import com.equifreight.entity.Handover;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HandoverRepository extends JpaRepository<Handover, UUID> {
    Optional<Handover> findByJob_Id(UUID jobId);

    /** Handovers still waiting for the customer's answer after its due time (US-F6-02). */
    List<Handover> findByHandedOverAtIsNotNullAndCustomerOutcomeIsNullAndConfirmDueAtBefore(Instant at);
}
