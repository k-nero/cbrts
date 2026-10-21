package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A country we serve. Other tables reference it by id; look one up by its ISO 3166-1 alpha-2 `code`, which is unique.
 */
@Setter
@Getter
@Entity
@Table(name = "countries")
public class Country extends BaseEntity {

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 2, unique = true)
    private String code;

    @Column(nullable = false, length = 80)
    private String name;
}
