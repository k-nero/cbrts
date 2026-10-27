package com.equifreight.entity.enums;

/**
 * {@code rate_lines.basis}, {@code quotation_lines.basis}.
 */
public enum RateBasis {
    PER_HORSE,
    PER_SHIPMENT,
    PER_KM,
    PER_DAY,
    PER_CROSSING,
    PER_HOUR,
    PER_POSITION,
    /** Grooms: one per three horses, rounded up. */
    PER_THREE_HORSES,
    /** The flight veterinarian: from FLIGHT_VET_MIN_HORSES, above HIGH_VALUE_THRESHOLD, or on a vet-escort request. */
    FLIGHT_VET,
    /** A vet riding with a road move, once per shipment, when the customer asks for a vet escort. */
    VET_ESCORT
}
