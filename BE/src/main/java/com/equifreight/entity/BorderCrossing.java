package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** "Mộc Bài – Bavet", "Poipet – Aranyaprathet". */
@Setter
@Getter
@Entity
@Table(name = "border_crossings")
public class BorderCrossing extends BaseEntity {

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_country", nullable = false)
    private Country fromCountry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_country", nullable = false)
    private Country toCountry;

    @Column(nullable = false)
    private boolean roadOnly;
}
