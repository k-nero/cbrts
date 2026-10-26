package com.equifreight.entity;

import com.equifreight.entity.enums.VehicleKind;
import com.equifreight.entity.enums.VehicleStatus;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "vehicles")
public class Vehicle extends BaseEntity {

    /**
     * TX-447.
     */
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private VehicleKind kind;

    @Column(nullable = false)
    private int payloadKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private VehicleStatus status = VehicleStatus.ACTIVE;

    @OneToMany(mappedBy = "vehicle", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("positionNo")
    private List<VehicleStall> stalls = new ArrayList<>();

    /** Where the vehicle is based, and where it is when it has run no trip yet (US-F7-01). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_country_id", nullable = false)
    private Country homeCountry;

    /** The foreign countries it holds a permit for; the home country is never listed. */
    @ManyToMany
    @JoinTable(
            name = "vehicle_countries",
            joinColumns = @JoinColumn(name = "vehicle_id"),
            inverseJoinColumns = @JoinColumn(name = "country_id"))
    private Set<Country> permittedCountries = new HashSet<>();

    /** The road corridors the company runs it on. A road trip takes a vehicle only on one of these. */
    @ManyToMany
    @JoinTable(
            name = "vehicle_corridors",
            joinColumns = @JoinColumn(name = "vehicle_id"),
            inverseJoinColumns = @JoinColumn(name = "corridor_id"))
    private Set<Corridor> operatingCorridors = new HashSet<>();

    /** Its home country or one it holds a permit for. */
    public boolean mayEnter(Country country) {
        return sameId(homeCountry, country) || permittedCountries.stream().anyMatch(c -> sameId(c, country));
    }

    /**
     * Why it can't work {@code corridor}, or empty when it can: a vehicle runs only road corridors, and only when it
     * holds a permit for every country on one.
     */
    public Optional<String> refusalToRun(Corridor corridor) {
        if (!corridor.isRoad()) {
            return Optional.of(corridor.getCode() + " is flown; a vehicle works road corridors only.");
        }
        return corridor.countries().stream()
                .filter(country -> !mayEnter(country))
                .findFirst()
                .map(country -> code + " has no permit for " + country.getName() + ", so it can't run "
                        + corridor.getCode() + ".");
    }

    /** {@code corridor} is one of its operating corridors. */
    public boolean runs(Corridor corridor) {
        return operatingCorridors.stream().anyMatch(c -> sameId(c, corridor));
    }

    private static boolean sameId(BaseEntity a, BaseEntity b) {
        return a == b || (a != null && b != null && a.getId() != null && Objects.equals(a.getId(), b.getId()));
    }
}
