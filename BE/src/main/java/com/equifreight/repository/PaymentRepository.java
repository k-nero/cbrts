package com.equifreight.repository;

import com.equifreight.entity.Payment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Payments against an invoice (US-F6-03), recorded by hand or by the card gateway; never edited. */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    @EntityGraph(attributePaths = "recordedBy")
    List<Payment> findByInvoice_IdOrderByReceivedAtAsc(UUID invoiceId);

    /** One payment with what its receipt prints: the invoice, its request, job and club, and who recorded it. */
    @EntityGraph(
            attributePaths = {
                "invoice",
                "invoice.quotation",
                "invoice.quotation.request",
                "invoice.job",
                "invoice.club",
                "recordedBy"
            })
    Optional<Payment> findDetailedById(UUID id);
}
