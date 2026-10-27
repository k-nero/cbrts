package com.equifreight.entity.enums;

/**
 * {@code rate_policies.key}: one value per key and catalog version.
 */
public enum RatePolicyKey {
    FUEL_PCT,
    INSURANCE_PCT,
    CONTINGENCY_PCT,
    SERVICE_FEE_PCT,
    DEPOSIT_PCT,
    QUOTE_VALIDITY_DAYS,
    FLIGHT_VET_MIN_HORSES,
    HIGH_VALUE_THRESHOLD,
    ARRIVAL_WINDOW_PCT,
    ARRIVAL_WINDOW_MIN_HOURS,
    LATE_PENALTY_PCT_PER_HOUR,
    LATE_PENALTY_CAP_PCT,
    /** The estimate's minimum half-width in percent; the band is never narrower than the ESTIMATED share (BR-Q-11). */
    ESTIMATE_BAND_PCT,
    /** The kilograms one air stall carries; the heaviest horses that could share a stall must not exceed it (BR-Q-16). */
    STALL_PAYLOAD_KG,
    /** The most kilograms of horses one air shipment may carry (BR-Q-16). */
    AIR_SHIPMENT_MAX_KG,
    /** Hours after a trip ends before its vehicle can drive again: cleaning, disinfection, crew rest (US-F7-02). */
    TURNAROUND_HOURS,
    /** US-F3-22, drafting a journey from its quote: the hour a drafted first trip starts on the departure date. */
    PLAN_START_HOUR,
    /** The average road speed, km/h, a drafted route's driving time is worked out at. */
    PLAN_SPEED_KMH,
    /** Hours of driving between two welfare stops on a drafted route. */
    PLAN_WELFARE_EVERY_HOURS,
    /** Minutes a drafted route stays at a welfare stop. */
    PLAN_WELFARE_STOP_MIN,
    /** Minutes a drafted route stays at a border crossing. */
    PLAN_BORDER_STOP_MIN,
    /** Hours the horses wait at the cargo terminal before a flight: export checks and loading. */
    PLAN_AIRPORT_BEFORE_HOURS,
    /** Hours after a flight lands before the next road trip collects the horses: release by the airline and customs. */
    PLAN_AIRPORT_AFTER_HOURS
}
