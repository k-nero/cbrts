package com.equifreight.entity;

import com.equifreight.entity.enums.InvoiceKind;
import com.equifreight.entity.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * A deposit or final invoice for the accepted quotation, generated, never typed. An issued invoice is never edited:
 * it is voided and replaced, or corrected by a credit note. One live deposit and one live final invoice per quotation.
 */
@Setter
@Getter
@Entity
@Table(name = "invoices")
public class Invoice extends BaseEntity {

    /** INV-2026-0041. */
    @Column(nullable = false, unique = true, length = 16)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private InvoiceKind kind;

    /** The accepted version; its currency is the invoice currency. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    /** Null for the deposit invoice (the job is created at approval, after acceptance). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private TransportJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issued_by")
    private User issuedBy;

    private Instant issuedAt;

    /** 7 days after issue. */
    private LocalDate dueOn;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    /** A single rate (e.g. Vietnam VAT) set per invoice. */
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal taxPct = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    /** Updated with the status in the same transaction as a confirmed payment. */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    private Instant voidedAt;

    @Column(length = 500)
    private String voidReason;

    /** Set exactly for a credit note. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corrects_invoice_id")
    private Invoice correctsInvoice;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<InvoiceLine> lines = new ArrayList<>();

    public BigDecimal getAmountDue() {
        return total.subtract(amountPaid);
    }
}
