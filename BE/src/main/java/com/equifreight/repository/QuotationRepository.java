package com.equifreight.repository;

import com.equifreight.entity.Quotation;
import com.equifreight.entity.enums.QuotationStatus;
import com.equifreight.entity.enums.RequestStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, UUID> {
    Optional<Quotation> findByCode(String code);

    /** A request's latest quotation version. */
    Optional<Quotation> findFirstByRequestIdOrderByVersionNoDesc(UUID requestId);

    Optional<Quotation> findFirstByRequestIdAndStatusOrderByVersionNoDesc(UUID requestId, QuotationStatus status);

    Optional<Quotation> findByRequestIdAndVersionNo(UUID requestId, short versionNo);

    /** A request's latest version that is not a draft: what the customer sees. */
    Optional<Quotation> findFirstByRequestIdAndStatusNotOrderByVersionNoDesc(UUID requestId, QuotationStatus status);

    /** The non-draft versions of a page of requests, for the requests list. */
    List<Quotation> findByRequestIdInAndStatusNot(Collection<UUID> requestIds, QuotationStatus status);

    /** The versions in this status among these requests: on Home, the re-quotes being drafted (A4). */
    List<Quotation> findByRequestIdInAndStatus(Collection<UUID> requestIds, QuotationStatus status);

    /** Quotations in a status whose validity ends before the given instant: those to expire. */
    List<Quotation> findByStatusAndValidUntilBefore(QuotationStatus status, Instant before);

    /** Quotations not yet reminded whose validity ends before the given instant: those to remind. */
    List<Quotation> findByStatusAndReminderSentAtIsNullAndValidUntilBefore(QuotationStatus status, Instant before);

    /** Every version of a request's quotation, newest first. */
    List<Quotation> findByRequestIdOrderByVersionNoDesc(UUID requestId);

    /** How many quotations a catalog version is pinned to. */
    long countByRateCatalogVersionId(UUID versionId);

    /** Issued quotations waiting for the customer's answer (US-R-01); sorted by the caller, soonest expiry first. */
    @EntityGraph(attributePaths = {"request", "request.club"})
    Page<Quotation> findByStatusAndRequest_Status(
            QuotationStatus status, RequestStatus requestStatus, Pageable pageable);
}
