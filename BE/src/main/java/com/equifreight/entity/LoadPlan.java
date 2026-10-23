package com.equifreight.entity;

import com.equifreight.entity.enums.LoadPlanStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * Which horse stands in which stall of one vehicle on a trip; each vehicle on the trip has one load plan. Confirming
 * needs every horse placed and no conflict. Conflicts (box need in a standard stall, stallion beside a mare, payload)
 * are computed, not stored.
 */
@Setter
@Getter
@Entity
@Table(name = "load_plans")
public class LoadPlan extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_vehicle_id", nullable = false, unique = true)
    private TripVehicle tripVehicle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private LoadPlanStatus status = LoadPlanStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by")
    private User confirmedBy;

    private Instant confirmedAt;

    @OneToMany(mappedBy = "loadPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LoadPlanStall> stalls = new ArrayList<>();

    /** The vehicle this plan loads: its trip vehicle's. */
    public Vehicle getVehicle() {
        return tripVehicle.getVehicle();
    }
}
