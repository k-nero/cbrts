package com.equifreight.entity;

import com.equifreight.entity.enums.HorseCoat;
import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.StallType;
import com.equifreight.entity.enums.Temperament;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Archived, never deleted, because past jobs refer to it.
 */
@Setter
@Getter
@Entity
@Table(name = "horses")
public class Horse extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    /**
     * Unique per club among active horses.
     */
    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private HorseCoat coat;

    @Column(length = 60)
    private String breed;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private HorseSex sex;

    private LocalDate dateOfBirth;

    @Column(precision = 3, scale = 1)
    private BigDecimal heightHh;

    private Short weightKg;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "size_class_id", nullable = false)
    private HorseSizeClass sizeClass;

    @Column(unique = true, length = 20)
    private String microchip;

    @Column(length = 40)
    private String passportNo;

    /**
     * Insurance base, taken as stated.
     */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal declaredValue;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 3)
    private String valueCurrency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Temperament temperament;

    /**
     * A stallion or aggressive horse needs BOX (application rule, shown as a load-plan conflict).
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StallType requiredStall = StallType.STANDARD;

    @Column(columnDefinition = "text")
    private String handlingNotes;

    private Instant archivedAt;
}
