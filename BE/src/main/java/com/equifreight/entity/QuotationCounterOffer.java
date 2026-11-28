package com.equifreight.entity;

import com.equifreight.entity.enums.CounterOfferStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * A club's counter-offer on one issued quotation version: the lines it would like cheaper, at its price and with its
 * reason. It changes no price; the logistics manager answers with a revised version or "best price" (spec
 * 2026-11-23, quotation negotiation). One per version.
 */
@Setter
@Getter
@Entity
@Table(name = "quotation_counter_offers")
public class QuotationCounterOffer extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false, unique = true)
    private Quotation quotation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private TransportRequest request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    /** The club's note for the whole counter-offer; optional. */
    @Column(length = 500)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private CounterOfferStatus status = CounterOfferStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "answered_by")
    private User answeredBy;

    private Instant answeredAt;

    /** The manager's "best price" message. */
    @Column(length = 500)
    private String answerMessage;

    /** The version that answered it (REVISED). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "answered_with_quotation_id")
    private Quotation answeredWithQuotation;

    @OneToMany(mappedBy = "counterOffer", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt")
    private List<QuotationCounterOfferLine> lines = new ArrayList<>();
}
