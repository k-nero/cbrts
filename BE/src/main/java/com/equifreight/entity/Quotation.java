package com.equifreight.entity;

import com.equifreight.entity.enums.QuotationStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One version of a quotation for a request. Totals are computed in the fixed order of the quotation spec and
 * stored once issued, because an issued quotation is a document. One ACCEPTED version per request.
 */
@Setter
@Getter
@Entity
@Table(name = "quotations")
public class Quotation extends BaseEntity {

    /**
     * Q-2026-0188. Shared by all versions of one quotation.
     */
    @Column(nullable = false, length = 14)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private TransportRequest request;

    @Column(nullable = false)
    private short versionNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private QuotationStatus status = QuotationStatus.DRAFT;

    /**
     * Pinned: a later catalog change never alters this quotation.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rate_catalog_version_id", nullable = false)
    private RateCatalogVersion rateCatalogVersion;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 3)
    private String currency;

    /**
     * FX rates pinned at issue (step "Convert"), as JSON.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    private String fxRates;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prepared_by")
    private User preparedBy;

    private Instant issuedAt;

    /**
     * issuedAt + QUOTE_VALIDITY_DAYS (BR-F1-03).
     */
    private Instant validUntil;

    @Column(precision = 14, scale = 2)
    private BigDecimal subtotal;

    @Column(precision = 14, scale = 2)
    private BigDecimal volumeBreak;

    @Column(precision = 14, scale = 2)
    private BigDecimal fuel;

    @Column(precision = 14, scale = 2)
    private BigDecimal insurance;

    @Column(precision = 14, scale = 2)
    private BigDecimal contingency;

    @Column(precision = 14, scale = 2)
    private BigDecimal serviceFee;

    @Column(precision = 14, scale = 2)
    private BigDecimal arrivalWindowSurcharge;

    @Column(precision = 14, scale = 2)
    private BigDecimal total;

    @Column(precision = 5, scale = 2)
    private BigDecimal depositPct;

    @Column(precision = 14, scale = 2)
    private BigDecimal depositAmount;

    /**
     * Copied from the pinned catalog when there is an arrival window; part of the contract.
     */
    @Column(precision = 5, scale = 2)
    private BigDecimal latePenaltyPctPerHour;

    @Column(precision = 5, scale = 2)
    private BigDecimal latePenaltyCapPct;

    private Instant acceptedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_by")
    private User acceptedBy;

    private Instant declinedAt;

    @Column(length = 500)
    private String declineReason;

    /**
     * "Departure moved from 12 Nov to 20 Nov."
     */
    @Column(length = 300)
    private String supersededReason;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("groupCode, position")
    private List<QuotationLine> lines = new ArrayList<>();
}
