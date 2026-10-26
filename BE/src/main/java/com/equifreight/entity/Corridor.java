package com.equifreight.entity;

import com.equifreight.entity.enums.TransportMode;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.Getter;
import lombok.Setter;

/**
 * "RD HCM → PNH", "AIR PNH → HKG". A request works out its border crossings from here.
 */
@Setter
@Getter
@Entity
@Table(name = "corridors")
public class Corridor extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransportMode mode;

    @Column(nullable = false, length = 80)
    private String originCity;

    @Column(nullable = false, length = 80)
    private String destinationCity;

    private Integer distanceKm;

    /**
     * How far a request's flexible dates can move on this route, 0 to 7 days (#115); 0 means fixed dates only.
     * Set by the fleet & route coordinator, copied onto a request when it is submitted.
     */
    @Column(nullable = false)
    private short dateFlexDays = 3;

    /** The country the route starts in: the first crossing's, or its origin city's places'. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "origin_country_id", nullable = false)
    private Country originCountry;

    /** The country the route ends in: the last crossing's, or its destination city's places'. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_country_id", nullable = false)
    private Country destinationCountry;

    @OneToMany(mappedBy = "corridor", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("seq")
    private List<CorridorCrossing> crossings = new ArrayList<>();

    public boolean isRoad() {
        return mode == TransportMode.ROAD;
    }

    /**
     * The countries the route passes through, in order: where it starts, then the country each crossing enters, then
     * where it ends if no crossing entered it. "RD HCM → BKK" is VN, KH, TH; "RD HCM → HAN" is VN.
     */
    public List<Country> countries() {
        List<Country> countries = new ArrayList<>();
        countries.add(originCountry);
        for (CorridorCrossing crossing : crossings) {
            Country entered = crossing.getBorderCrossing().getToCountry();
            if (!sameCountry(countries.getLast(), entered)) countries.add(entered);
        }
        if (destinationCountry != null && !sameCountry(countries.getLast(), destinationCountry)) {
            countries.add(destinationCountry);
        }
        return countries;
    }

    private static boolean sameCountry(Country a, Country b) {
        return a == b || (a != null && b != null && Objects.equals(a.getId(), b.getId()));
    }
}
