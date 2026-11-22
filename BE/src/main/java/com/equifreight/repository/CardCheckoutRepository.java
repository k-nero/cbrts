package com.equifreight.repository;

import com.equifreight.entity.CardCheckout;
import com.equifreight.entity.enums.CardCheckoutStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

/** Online card checkouts of invoices (database-design.md, 13A). */
@Repository
public interface CardCheckoutRepository extends JpaRepository<CardCheckout, UUID> {

    /** The checkout a Stripe event is about, locked so a retried event is handled once. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CardCheckout> findLockedBySessionId(String sessionId);

    /** The invoice's open checkout, if any: at most one (card_checkouts_one_open_idx). */
    Optional<CardCheckout> findFirstByInvoice_IdAndStatus(UUID invoiceId, CardCheckoutStatus status);
}
