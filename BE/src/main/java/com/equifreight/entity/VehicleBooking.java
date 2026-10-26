package com.equifreight.entity;

import com.equifreight.entity.enums.BookingKind;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

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
     * Set exactly when kind is JOB: one booking per vehicle per trip, however many jobs it carries.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    /** Set exactly when kind is RESERVED: the accepted request this vehicle is held for (US-F7-02). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private TransportRequest request;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private BookingKind kind;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private Instant endsAt;
}
