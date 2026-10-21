package com.equifreight.entity;

import com.equifreight.entity.enums.TransportMode;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
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

    @OneToMany(mappedBy = "corridor", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("seq")
    private List<CorridorCrossing> crossings = new ArrayList<>();
}
