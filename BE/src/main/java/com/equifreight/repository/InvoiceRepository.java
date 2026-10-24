package com.equifreight.repository;

import com.equifreight.entity.Invoice;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Invoices (US-F6-03): a deposit and a final invoice per accepted quotation, never edited once issued. */
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    /** The quotation's invoice of a kind that isn't void: at most one (invoices_quotation_id_*_idx). */
    Optional<Invoice> findFirstByQuotation_IdAndKindAndStatusNot(UUID quotationId, InvoiceKind kind, InvoiceStatus not);

    /** The Invoices list, by status. */
    @EntityGraph(attributePaths = {"club", "job", "quotation", "quotation.request"})
    Page<Invoice> findByStatusIn(Collection<InvoiceStatus> statuses, Pageable pageable);

    /** Overdue: unpaid and due before today. */
    @EntityGraph(attributePaths = {"club", "job", "quotation", "quotation.request"})
    Page<Invoice> findByStatusInAndDueOnBefore(Collection<InvoiceStatus> statuses, LocalDate day, Pageable pageable);

    /** A request's invoices the customer sees (not drafts), oldest first. */
    @EntityGraph(attributePaths = {"job", "quotation", "quotation.request"})
    List<Invoice> findByQuotation_Request_IdAndStatusNotOrderByCreatedAtAsc(UUID requestId, InvoiceStatus not);

    /** Whether the job has a final invoice that isn't void. */
    boolean existsByJob_IdAndKindAndStatusNot(UUID jobId, InvoiceKind kind, InvoiceStatus not);
}
