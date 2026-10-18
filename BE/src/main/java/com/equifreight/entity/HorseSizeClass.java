package com.equifreight.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * S, M, L, XL: the stall width one horse of the class takes. Seeded by V2; V16 adds the height bands
 * the server derives a horse's class from (HorseSizing).
 */
@Setter
@Getter
@Entity
@Table(name = "horse_size_classes")
public class HorseSizeClass extends BaseEntity {

    @Column(nullable = false, unique = true, length = 4)
    private String code;

    @Column(nullable = false)
    private short widthIn;

    private Short maxWeightKg;

    /**
     * Lowest height in the class, in hands; the class runs up to the next class's minimum.
     */
    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal minHeightHh;
}
