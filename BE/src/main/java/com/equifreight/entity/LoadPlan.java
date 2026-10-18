package com.equifreight.entity;

import com.equifreight.entity.enums.LoadPlanStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * Which horse stands in which stall. One CONFIRMED plan per job; confirming needs every horse placed and no
 * conflict. Conflicts (box need in a standard stall, stallion beside a mare, payload) are computed, not stored.
 */
@Setter
@Getter
@Entity
@Table(name = "load_plans")
public class LoadPlan extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private TransportJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private LoadPlanStatus status = LoadPlanStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by")
    private User confirmedBy;

    private Instant confirmedAt;

    @OneToMany(mappedBy = "loadPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LoadPlanStall> stalls = new ArrayList<>();
}
