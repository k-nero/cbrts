package com.equifreight.entity;

import com.equifreight.entity.enums.FeeBandKind;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/** Cancellation fee % or short-notice price multiplier, by days before departure. */
@Setter
@Getter
@Entity
@Table(name = "rate_fee_bands")
public class RateFeeBand extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private RateCatalogVersion version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FeeBandKind kind;

    @Column(nullable = false)
    private short minDays;

    private Short maxDays;

    @Column(nullable = false, precision = 6, scale = 3)
    private BigDecimal value;
}
