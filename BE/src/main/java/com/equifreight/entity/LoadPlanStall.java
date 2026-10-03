package com.equifreight.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "load_plan_stalls")
public class LoadPlanStall extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "load_plan_id", nullable = false)
    private LoadPlan loadPlan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_stall_id", nullable = false)
    private VehicleStall vehicleStall;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "horse_id", nullable = false)
    private Horse horse;
}
