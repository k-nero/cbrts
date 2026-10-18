package com.equifreight.entity;

import com.equifreight.entity.enums.BookingKind;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * The fleet calendar. Overlapping bookings of one vehicle are refused by an exclusion constraint.
 */
@Setter
@Getter
@Entity
@Table(name = "vehicle_bookings")
public class VehicleBooking extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    /**
     * Set exactly when kind is JOB.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private TransportJob job;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private BookingKind kind;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private Instant endsAt;
}
