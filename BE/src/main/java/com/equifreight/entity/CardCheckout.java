package com.equifreight.entity;

import com.equifreight.entity.enums.CardCheckoutStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * A Stripe Checkout page the customer was sent to, to pay an invoice by card (database-design.md, 13A). It is not a
 * payment: the {@link Payment} row is written only when Stripe's webhook confirms the money. At most one is open per
 * invoice.
 */
@Setter
@Getter
@Entity
@Table(name = "card_checkouts")
public class CardCheckout extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    /** Stripe's Checkout Session id ({@code cs_...}). */
    @Column(nullable = false, unique = true, length = 100)
    private String sessionId;

    /** Stripe's hosted page, reused while it is open for the same amount. */
    @Column(nullable = false, columnDefinition = "text")
    private String url;

    /** The amount due when the checkout was opened, in the invoice's currency. */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CardCheckoutStatus status = CardCheckoutStatus.OPEN;

    @Column(nullable = false)
    private Instant expiresAt;

    /** The customer who opened it. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "started_by", nullable = false)
    private User startedBy;

    /** Stripe's PaymentIntent id ({@code pi_...}), once paid. */
    @Column(length = 100)
    private String paymentIntent;

    /** The payment it recorded, once paid. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", unique = true)
    private Payment payment;

    /** Stripe's refund id ({@code re_...}), when the money was sent back. */
    @Column(length = 100)
    private String refundId;
}
