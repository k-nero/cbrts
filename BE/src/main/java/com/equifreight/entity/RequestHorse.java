package com.equifreight.entity;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import jakarta.persistence.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.*;

/**
 * A horse on a request, with a snapshot of the fields that price it, so later edits to the horse don't change it.
 */
@Setter
@Getter
@Entity
@Table(name = "request_horses")
public class RequestHorse {

    @EmbeddedId
    private Key id = new Key();

    @MapsId("requestId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private TransportRequest request;

    @MapsId("horseId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "horse_id")
    private Horse horse;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal declaredValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private HorseSex sex;

    @Column(nullable = false, length = 4)
    private String sizeClassCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StallType requiredStall;

    /** A mare travelling with a foal at foot, on this trip. */
    @Column(nullable = false)
    private boolean withFoal;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    @Embeddable
    public static class Key implements Serializable {
        private UUID requestId;
        private UUID horseId;
    }
}
