package com.equifreight.entity.enums;

/**
 * {@code incidents.kind}. The escort reports a {@code VEHICLE} breakdown, a prolonged {@code TRAFFIC} jam, a horse
 * medical incident ({@code WELFARE}) or {@code OTHER} from the cab (US-F5-01).
 */
public enum IncidentKind {
    HELD,
    CUSTOMER_REPORT,
    WELFARE,
    VEHICLE,
    TRAFFIC,
    OTHER;

    /** The kind in words, as the cab and the incident page say it. */
    public String label() {
        return switch (this) {
            case HELD -> "Held";
            case CUSTOMER_REPORT -> "Customer report";
            case WELFARE -> "Horse medical incident";
            case VEHICLE -> "Vehicle breakdown";
            case TRAFFIC -> "Prolonged traffic jam";
            case OTHER -> "Other emergency";
        };
    }
}
