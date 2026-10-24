package com.equifreight.repository;

import com.equifreight.entity.Payment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Payments recorded by hand against an invoice (US-F6-03); never edited. */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    @EntityGraph(attributePaths = "recordedBy")
    List<Payment> findByInvoice_IdOrderByReceivedAtAsc(UUID invoiceId);
}
