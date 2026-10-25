package com.equifreight.entity.enums;

/**
 * {@code route_stops.kind}. A BORDER stop has a crossing, every other kind a place; PICKUP, DELIVERY and TRANSFER name their job.
 */
public enum RouteStopKind {
    PICKUP,
    BORDER,
    WELFARE,
    DELIVERY,
    AIRPORT_OUT,
    AIRPORT_IN,
    QUARANTINE,
    REFUELLING,
    /** Where a job's horses leave this trip for the next trip of its chain (US-F3-16); names the job. */
    TRANSFER
}
