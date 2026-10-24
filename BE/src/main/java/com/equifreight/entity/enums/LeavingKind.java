package com.equifreight.entity.enums;

/**
 * {@code incident_options.leaving_kind}: how horses leave a moving trip (US-F5-06, docs/shared-trips-design.md).
 */
public enum LeavingKind {
    /** Unloaded at a safe place (a clinic, a stable) and continuing later on a new trip. */
    UNLOAD,
    /** Collected where they are by a second vehicle, as a new trip. */
    SECOND_VEHICLE,
    /** Taken back to their pickup place on a new trip, to be rescheduled or cancelled. */
    RETURN_TO_ORIGIN,
    /** Left at a clinic or stable and not travelling on: delivered there, as far as this move goes. */
    LEAVE_IN_CARE;

    public String label() {
        return switch (this) {
            case UNLOAD -> "Unload at a safe place, continue later";
            case SECOND_VEHICLE -> "Send a second vehicle";
            case RETURN_TO_ORIGIN -> "Return to origin";
            case LEAVE_IN_CARE -> "Leave in care";
        };
    }
}
