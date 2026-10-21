package com.equifreight.entity;

import com.equifreight.entity.enums.CodePrefix;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Issues the human codes (REQ-, Q-, CBRT-, EF-, INV-): one counter per prefix and year. Advanced with an upsert that
 * locks the row until the creating transaction commits, so a code is never issued twice.
 */
@Setter
@Getter
@Entity
@Table(
        name = "code_counters",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "code_counters_prefix_year_key",
                        columnNames = {"prefix", "year"}))
public class CodeCounter extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 4)
    private CodePrefix prefix;

    @Column(nullable = false)
    private short year;

    @Column(nullable = false)
    private int lastValue;
}
