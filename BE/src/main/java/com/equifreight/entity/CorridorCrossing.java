package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * The border crossings of a corridor, in order.
 */
@Setter
@Getter
@Entity
@Table(
        name = "corridor_crossings",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "corridor_crossings_corridor_id_seq_key",
                        columnNames = {"corridor_id", "seq"}))
public class CorridorCrossing extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corridor_id", nullable = false)
    private Corridor corridor;

    /** The crossing's place in the corridor, from 1. */
    @Column(nullable = false)
    private short seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "border_crossing_id", nullable = false)
    private BorderCrossing borderCrossing;
}
