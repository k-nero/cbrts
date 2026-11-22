package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.QuotationCounterOffer;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.enums.CounterOfferStatus;
import com.equifreight.repository.QuotationCounterOfferRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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

    /**
     * The open counter-offer the manager can still answer: none once the departure day has come, when nothing more
     * can be answered (spec 2026-11-23). The row itself stays OPEN; views treat it as closed.
     */
    public Optional<QuotationCounterOffer> pending(TransportRequest request, Instant now) {
        return departureHasCome(request, now) ? Optional.empty() : open(request.getId());
    }

    /** The requests among {@code requestIds} with a counter-offer the manager can still answer, in one query. */
    public Set<UUID> pendingOn(Collection<UUID> requestIds, Instant now) {
        if (requestIds.isEmpty()) return Set.of();
        return counterOffers.findByRequestIdInAndStatus(requestIds, CounterOfferStatus.OPEN).stream()
                .filter(o -> !departureHasCome(o.getRequest(), now))
                .map(o -> o.getRequest().getId())
                .collect(Collectors.toSet());
    }

    /** Every counter-offer on the request, one per version at most. */
    public List<QuotationCounterOffer> onRequest(UUID requestId) {
        return counterOffers.findByRequestId(requestId);
    }

    /** The departure day has come (business zone): nothing on the request's quotation can be answered any more. */
    public static boolean departureHasCome(TransportRequest request, Instant now) {
        LocalDate departure = request.getDepartureDate();
        return departure != null && !departure.isAfter(LocalDate.ofInstant(now, BusinessTime.ZONE));
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
