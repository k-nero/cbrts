package com.equifreight.entity;

import com.equifreight.entity.enums.RoutePlanStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * A version of a trip's route: stops joined by legs. Re-planning (Flow 5) confirms a new version and marks the old
 * one SUPERSEDED with the reason; nothing is deleted. The customer sees every confirmed version; drafts are staff-only.
 */
@Setter
@Getter
@Entity
@Table(name = "route_plans")
public class RoutePlan extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(nullable = false)
    private short versionNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private RoutePlanStatus status = RoutePlanStatus.DRAFT;

    private Integer distanceKm;

    private Integer durationMin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by")
    private User confirmedBy;

    private Instant confirmedAt;

    private Instant supersededAt;

    /**
     * "Re-routed via Poipet: Mộc Bài closed to vehicles over 10 t".
     */
    @Column(length = 500)
    private String changeReason;

    @OneToMany(mappedBy = "routePlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("seq")
    private List<RouteStop> stops = new ArrayList<>();

    @OneToMany(mappedBy = "routePlan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("seq")
    private List<RouteLeg> legs = new ArrayList<>();
}
