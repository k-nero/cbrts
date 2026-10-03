package com.equifreight.entity;

import com.equifreight.entity.enums.StallSide;
import com.equifreight.entity.enums.StallType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "vehicle_stalls")
public class VehicleStall extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(nullable = false)
    private short positionNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StallType stallType = StallType.STANDARD;

    @Column(nullable = false)
    private short rowNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private StallSide side;

    @Column(nullable = false)
    private boolean nearRamp;
}
