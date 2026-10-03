package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** "Cambodia import": one regulation catalog per country, versioned. */
@Setter
@Getter
@Entity
@Table(name = "regulation_catalogs")
public class RegulationCatalog extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "country_code", nullable = false, unique = true)
    private Country country;

    @Column(nullable = false, length = 120)
    private String name;
}
