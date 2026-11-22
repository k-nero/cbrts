package com.equifreight.service;

import com.equifreight.entity.QuotationCounterOffer;
import com.equifreight.entity.enums.CounterOfferStatus;
import com.equifreight.repository.QuotationCounterOfferRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Where a club's counter-offers stand: the one open on a request, the one on a version, and closing an open one when
 * the request moves on without an answer (accept, decline, cancel, reject).
 */
@Service
public class CounterOfferLedger {

    private final QuotationCounterOfferRepository counterOffers;

    public CounterOfferLedger(QuotationCounterOfferRepository counterOffers) {
        this.counterOffers = counterOffers;
    }

    /** The counter-offer still waiting for the logistics manager on this request, if any. */
    public Optional<QuotationCounterOffer> open(UUID requestId) {
        return counterOffers.findFirstByRequestIdAndStatus(requestId, CounterOfferStatus.OPEN);
    }

    /** The counter-offer on one version, whatever its status. */
    public Optional<QuotationCounterOffer> on(UUID quotationId) {
        return counterOffers.findByQuotationId(quotationId);
    }

    /** Closes the open counter-offer on the request, if any, without an answer. */
    public void closeOpen(UUID requestId, Instant at) {
        open(requestId).ifPresent(o -> {
            o.setStatus(CounterOfferStatus.CLOSED);
            o.setAnsweredAt(at);
            counterOffers.saveAndFlush(o);
        });
    }

    /** Saves and flushes, so a second counter-offer on the same version fails here (unique quotation_id). */
    public QuotationCounterOffer save(QuotationCounterOffer counterOffer) {
        return counterOffers.saveAndFlush(counterOffer);
    }
}
