package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/** The border crossings of a corridor, in order. */
@Setter
@Getter
@Entity
@Table(name = "corridor_crossings")
public class CorridorCrossing {

    @EmbeddedId
    private Key id = new Key();

    @MapsId("corridorId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corridor_id")
    private Corridor corridor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "border_crossing_id", nullable = false)
    private BorderCrossing borderCrossing;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    @Embeddable
    public static class Key implements Serializable {
        private UUID corridorId;
        private short seq;
    }
}
