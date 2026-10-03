package com.equifreight.entity;

import com.equifreight.entity.enums.CodePrefix;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/**
 * Issues the human codes (REQ-, Q-, CBRT-, EF-, INV-). Read with a row lock (select … for update) inside the
 * creating transaction so a code is never issued twice.
 */
@Setter
@Getter
@Entity
@Table(name = "code_counters")
public class CodeCounter {

    @EmbeddedId
    private Key id = new Key();

    @Column(nullable = false)
    private int lastValue;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    @Embeddable
    public static class Key implements Serializable {
        @Enumerated(EnumType.STRING)
        @Column(length = 4)
        private CodePrefix prefix;

        private short year;
    }
}
