package com.equifreight.entity;

import com.equifreight.entity.enums.LineCertainty;
import com.equifreight.entity.enums.LineSource;
import com.equifreight.entity.enums.RateBasis;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

/**
 * A priced line of a quotation. Quantities are derived from the request, never typed.
 */
@Setter
@Getter
@Entity
@Table(name = "quotation_lines")
public class QuotationLine extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 1)
    private String groupCode;

    /**
     * Order inside the group.
     */
    @Column(nullable = false)
    private short position;

    @Column(nullable = false, length = 160)
    private String description;

    /**
     * "per day · 14 days".
     */
    @Column(length = 80)
    private String basisText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RateBasis basis;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    /**
     * Null means "No rate", which blocks issue (BR-Q-08).
     */
    @Column(precision = 14, scale = 2)
    private BigDecimal unitRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private LineSource source;

    /**
     * Set when source is CATALOG.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rate_line_id")
    private RateLine rateLine;

    /**
     * Set instead of rateLine on the air stall line, which is priced from a service class.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rate_service_class_id")
    private RateServiceClass rateServiceClass;

    /**
     * For per-horse lines (isolation for Nightfall).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "horse_id")
    private Horse horse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private LineCertainty certainty = LineCertainty.FIXED;

    /**
     * Why an estimated line can vary.
     */
    @Column(length = 300)
    private String estimateNote;

    /**
     * quantity × unit rate (with the line's minimum charge).
     */
    @Column(precision = 14, scale = 2)
    private BigDecimal catalogAmount;

    @Column(precision = 14, scale = 2)
    private BigDecimal overrideAmount;

    /**
     * Mandatory with an override (DB check).
     */
    @Column(length = 300)
    private String overrideReason;

    /**
     * coalesce(overrideAmount, catalogAmount): a generated column, read back after every write.
     */
    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(precision = 14, scale = 2, insertable = false, updatable = false)
    private BigDecimal lineTotal;
}
