package com.equifreight.entity;

import com.equifreight.entity.enums.RatePolicyKey;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * One value per key and catalog version (fuel %, deposit %, quote validity days, …).
 */
@Setter
@Getter
@Entity
@Table(name = "rate_policies")
public class RatePolicy {

    @EmbeddedId
    private Key id = new Key();

    @MapsId("versionId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id")
    private RateCatalogVersion version;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal value;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    @Embeddable
    public static class Key implements Serializable {
        private UUID versionId;

        @Enumerated(EnumType.STRING)
        @Column(name = "key", length = 40)
        private RatePolicyKey key;
    }
}
