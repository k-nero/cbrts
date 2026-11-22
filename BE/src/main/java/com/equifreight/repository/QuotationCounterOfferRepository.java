package com.equifreight.repository;

import com.equifreight.entity.QuotationCounterOffer;
import com.equifreight.entity.enums.CounterOfferStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuotationCounterOfferRepository extends JpaRepository<QuotationCounterOffer, UUID> {

    /** The counter-offer on one version; there is at most one (unique quotation_id). */
    Optional<QuotationCounterOffer> findByQuotationId(UUID quotationId);

    Optional<QuotationCounterOffer> findFirstByRequestIdAndStatus(UUID requestId, CounterOfferStatus status);

    /** Every counter-offer on the request, one per version at most. */
    List<QuotationCounterOffer> findByRequestId(UUID requestId);

    List<QuotationCounterOffer> findByRequestIdInAndStatus(Collection<UUID> requestIds, CounterOfferStatus status);
}
