package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** The one table keyed by a natural code (ISO 3166-1 alpha-2). Seeded by V2. */
@Setter
@Getter
@Entity
@Table(name = "countries")
public class Country {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 2)
    private String code;

    @Column(nullable = false, length = 80)
    private String name;
}
