package com.equifreight.entity;

import com.equifreight.entity.enums.PlaceKind;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "places")
public class Place extends BaseEntity {

    @Column(nullable = false, length = 160)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlaceKind kind;

    @Column(length = 80)
    private String city;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "country_id", nullable = false)
    private Country country;

    @Column(length = 300)
    private String address;

    /** An airport or its cargo terminal: where a flight takes the horses on and hands them over. */
    public boolean isTerminal() {
        return kind == PlaceKind.AIRPORT || kind == PlaceKind.CARGO_TERMINAL;
    }
}
