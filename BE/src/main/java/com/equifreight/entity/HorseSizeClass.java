package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** S, M, L, XL: the stall width one horse of the class takes. Seeded by V2. */
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
}
