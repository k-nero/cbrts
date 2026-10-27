package com.equifreight.repository;

import com.equifreight.entity.Invoice;
import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceStatus;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Invoices (US-F6-03): a deposit and a final invoice per accepted quotation, never edited once issued. */
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    /** The quotation's invoice of a kind that isn't void: at most one (invoices_quotation_id_*_idx). */
    Optional<Invoice> findFirstByQuotation_IdAndKindAndStatusNot(UUID quotationId, InvoiceKind kind, InvoiceStatus not);

    /**
     * The request's deposit invoice that isn't void, locked so a payment can't be recorded while it is voided. At most
     * one: only the accepted quotation version carries a deposit.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Invoice> findFirstByQuotation_Request_IdAndKindAndStatusNot(
            UUID requestId, InvoiceKind kind, InvoiceStatus not);

    /** The Invoices list, by status. */
    @EntityGraph(attributePaths = {"club", "job", "quotation", "quotation.request"})
    Page<Invoice> findByStatusIn(Collection<InvoiceStatus> statuses, Pageable pageable);

    /** Overdue: unpaid and due before today. */
    @EntityGraph(attributePaths = {"club", "job", "quotation", "quotation.request"})
    Page<Invoice> findByStatusInAndDueOnBefore(Collection<InvoiceStatus> statuses, LocalDate day, Pageable pageable);

    /** A request's invoices the customer sees (not drafts), oldest first. */
    @EntityGraph(attributePaths = {"job", "quotation", "quotation.request"})
    List<Invoice> findByQuotation_Request_IdAndStatusNotOrderByCreatedAtAsc(UUID requestId, InvoiceStatus not);

    /** Every invoice of a request on the staff side, drafts and voids included, oldest first: the deposit first. */
    @EntityGraph(attributePaths = {"club", "job", "quotation", "quotation.request"})
    List<Invoice> findByQuotation_Request_IdOrderByCreatedAtAsc(UUID requestId);

    /** The club's invoices of some kinds still to be paid (the customer's Home). */
    @EntityGraph(attributePaths = {"job", "quotation", "quotation.request"})
    List<Invoice> findByClub_IdAndKindInAndStatusIn(
            UUID clubId, Collection<InvoiceKind> kinds, Collection<InvoiceStatus> statuses);

    /** Whether the job has a final invoice that isn't void. */
    boolean existsByJob_IdAndKindAndStatusNot(UUID jobId, InvoiceKind kind, InvoiceStatus not);

    /**
     * The final invoices issued in a period (US-R-02), with their lines and the job's corridor, optionally on one
     * corridor; voids and drafts excluded. One query for the report.
     */
    @Query("""
            select distinct i from Invoice i
            join fetch i.job j join fetch j.request r left join fetch r.corridor c join fetch i.club
            left join fetch i.lines l left join fetch l.quotationLine
            where i.kind = com.equifreight.entity.enums.InvoiceKind.FINAL
              and i.status not in (com.equifreight.entity.enums.InvoiceStatus.DRAFT,
                                   com.equifreight.entity.enums.InvoiceStatus.VOID)
              and i.issuedAt >= :from and i.issuedAt < :to
              and (:corridor is null or c.id = :corridor)
            order by i.issuedAt
            """)
    List<Invoice> findFinalIssuedBetween(
            @Param("from") java.time.Instant from, @Param("to") java.time.Instant to, @Param("corridor") UUID corridor);

    /** The deposit invoices of some quotations that aren't void (US-R-02). */
    List<Invoice> findByQuotation_IdInAndKindAndStatusNot(
            Collection<UUID> quotationIds, InvoiceKind kind, InvoiceStatus not);
}
