package com.equifreight.repository;

import com.equifreight.entity.Handover;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface HandoverRepository extends JpaRepository<Handover, UUID> {
    Optional<Handover> findByJob_Id(UUID jobId);

    List<Handover> findByJob_IdIn(Collection<UUID> jobIds);

    /**
     * Jobs ready for their final invoice (US-F6-03): the customer answered the handover (or it was taken as accepted),
     * any discrepancy's incident is resolved, and no final invoice that isn't void exists yet.
     */
    @Query("""
            select h from Handover h join fetch h.job j join fetch j.request r join fetch r.club
            left join h.discrepancyIncident d
            where h.customerOutcome is not null
              and (d is null or d.status = com.equifreight.entity.enums.IncidentStatus.RESOLVED)
              and not exists (select 1 from Invoice i where i.job = j
                              and i.kind = com.equifreight.entity.enums.InvoiceKind.FINAL
                              and i.status <> com.equifreight.entity.enums.InvoiceStatus.VOID)
            order by h.confirmedAt
            """)
    List<Handover> findReadyForFinalInvoice();

    /** Handovers still waiting for the customer's answer after its due time (US-F6-02). */
    List<Handover> findByHandedOverAtIsNotNullAndCustomerOutcomeIsNullAndConfirmDueAtBefore(Instant at);
}
