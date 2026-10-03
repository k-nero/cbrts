package com.equifreight.entity;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;

/** Every line the quotation builder can expand. */
@Setter
@Getter
@Entity
@Table(name = "rate_lines")
public class RateLine extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private RateCatalogVersion version;

    /** Null means "every corridor". */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corridor_id")
    private Corridor corridor;

    @Column(nullable = false, length = 40)
    private String code;

    /** A–H: origin ground, pre-export, air, escort, documentation, post-arrival, destination ground, surcharges. */
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 1)
    private String groupCode;

    @Column(nullable = false, length = 160)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RateBasis basis;

    /** Pre-export isolation is priced per sex; null for every other line. */
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private HorseSex appliesToSex;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal rate;

    @Column(precision = 14, scale = 2)
    private BigDecimal minCharge;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RateCertainty certainty = RateCertainty.FIXED;
}
