package com.equifreight.entity;

import com.equifreight.entity.enums.InvoiceLineKind;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Setter
@Getter
@Entity
@Table(name = "invoice_lines")
public class InvoiceLine extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(nullable = false)
    private short position;

    /**
     * The quoted line this settles, if any.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_line_id")
    private QuotationLine quotationLine;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvoiceLineKind kind;

    @Column(nullable = false, length = 160)
    private String description;

    @Column(precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(precision = 14, scale = 2)
    private BigDecimal unitRate;

    /**
     * Negative for credits and deductions.
     */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    /**
     * Required for ACTUALISED and ADJUSTMENT: "Flight delayed: waited 3 h, quoted 2 h".
     */
    @Column(length = 300)
    private String note;
}
