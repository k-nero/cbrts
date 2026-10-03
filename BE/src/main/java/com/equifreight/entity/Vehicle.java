package com.equifreight.entity;

import com.equifreight.entity.enums.VehicleKind;
import com.equifreight.entity.enums.VehicleStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
@Entity
@Table(name = "vehicles")
public class Vehicle extends BaseEntity {

    /** TX-447. */
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
}
