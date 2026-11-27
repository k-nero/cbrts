package com.equifreight.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/** One line of a counter-offer: the line as quoted (snapshotted) and the club's price and reason for it. */
@Setter
@Getter
@Entity
@Table(name = "quotation_counter_offer_lines")
public class QuotationCounterOfferLine extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counter_offer_id", nullable = false)
    private QuotationCounterOffer counterOffer;

    /** The quotation line's key, which also finds it on the next version (QuotationLine.lineKey). */
    @Column(nullable = false, length = 80)
    private String lineKey;

    @Column(nullable = false, length = 160)
    private String description;

    /** The line's amount on the version asked about. */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal quotedAmount;

    /** What the club would pay: at least 0, below the quoted amount. */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal askedAmount;

    @Column(nullable = false, length = 300)
    private String reason;
}
