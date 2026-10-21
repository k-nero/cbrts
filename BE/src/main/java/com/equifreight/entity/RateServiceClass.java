package com.equifreight.entity;

import com.equifreight.entity.enums.ServiceClass;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/**
 * Air stall classes: one position is 96 in, shared by 3, 2 or 1 horses. Air corridors only.
 */
@Setter
@Getter
@Entity
@Table(name = "rate_service_classes")
public class RateServiceClass extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private RateCatalogVersion version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corridor_id", nullable = false)
    private Corridor corridor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ServiceClass serviceClass;

    @Column(nullable = false)
    private short widthPerHorseIn;

    @Column(nullable = false)
    private short horsesPerPosition;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal positionRate;
}
