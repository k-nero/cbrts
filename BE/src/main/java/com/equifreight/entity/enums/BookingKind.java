package com.equifreight.entity.enums;

/**
 * {@code vehicle_bookings.kind}.
 */
public enum BookingKind {
    JOB,
    MAINTENANCE,
    HOLD,
    /** A vehicle held for an accepted request until its trip's load plan is confirmed (US-F7-02). */
    RESERVED
}
