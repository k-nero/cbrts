package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * A discount band by number of horses. The application rejects overlapping bands.
 */
@Setter
@Getter
@Entity
@Table(name = "rate_volume_breaks")
public class RateVolumeBreak extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private RateCatalogVersion version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corridor_id")
    private Corridor corridor;

    @Column(nullable = false)
    private short minHorses;

    private Short maxHorses;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPct;
}
