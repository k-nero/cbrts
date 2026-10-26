package com.equifreight.entity;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/**
 * A horse on a request, with a snapshot of the fields that price it, so later edits to the horse don't change it.
 */
@Setter
@Getter
@Entity
@Table(
        name = "request_horses",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "request_horses_request_id_horse_id_key",
                        columnNames = {"request_id", "horse_id"}))
public class RequestHorse extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private TransportRequest request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "horse_id", nullable = false)
    private Horse horse;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal declaredValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private HorseSex sex;

    @Column(nullable = false, length = 4)
    private String sizeClassCode;

    /** The horse's weight when the request was sent (BR-Q-16); null on requests sent before it was kept. */
    private Short weightKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StallType requiredStall;

    /** A mare travelling with a foal at foot, on this trip. */
    @Column(nullable = false)
    private boolean withFoal;
}
