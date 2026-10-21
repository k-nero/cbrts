package com.equifreight.entity;

import com.equifreight.entity.enums.RatePolicyKey;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/**
 * One value per key and catalog version (fuel %, deposit %, quote validity days, …).
 */
@Setter
@Getter
@Entity
@Table(
        name = "rate_policies",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "rate_policies_version_id_key_key",
                        columnNames = {"version_id", "key"}))
public class RatePolicy extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private RateCatalogVersion version;

    @Enumerated(EnumType.STRING)
    @Column(name = "key", nullable = false, length = 40)
    private RatePolicyKey key;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal value;
}
