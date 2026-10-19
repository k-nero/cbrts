package com.equifreight.repository;

import com.equifreight.entity.Quotation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, UUID> {
    Optional<Quotation> findByCode(String code);

    /** A request's latest quotation version. */
    Optional<Quotation> findFirstByRequestIdOrderByVersionNoDesc(UUID requestId);

    Optional<Quotation> findByRequestIdAndVersionNo(UUID requestId, short versionNo);

    /** Every version of a request's quotation, newest first. */
    List<Quotation> findByRequestIdOrderByVersionNoDesc(UUID requestId);

    /** How many quotations a catalog version is pinned to. */
    long countByRateCatalogVersionId(UUID versionId);
}
