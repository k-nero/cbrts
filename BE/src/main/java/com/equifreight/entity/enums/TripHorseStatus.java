package com.equifreight.entity.enums;

/**
 * {@code trip_horses.status}.
 */
public enum TripHorseStatus {
    ON_TRIP,
    MOVED,
    DELIVERED,
    LEFT_IN_CARE,
    /** On a later trip of the job's chain (US-F3-16), waiting to be handed on from the trip before. */
    PLANNED,
    /** Left this trip for the next trip of the job's chain (US-F3-16). */
    HANDED_ON
}
