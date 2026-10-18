package com.equifreight.entity.enums;

/**
 * The five CBRTS roles. Stored by name in {@code roles.name}; Spring Security sees them as
 * {@code ROLE_<name>}. Roles follow the spec and are seeded, not edited in the app.
 */
public final class RoleName {
    public static final String CUSTOMER = "CUSTOMER";
    public static final String LOGISTICS_MANAGER = "LOGISTICS_MANAGER";
    public static final String TRANSPORT_SPECIALIST = "TRANSPORT_SPECIALIST";
    public static final String FLEET_COORDINATOR = "FLEET_COORDINATOR";
    public static final String ESCORT = "ESCORT";

    private RoleName() {}

    /** The role as the UI writes it, e.g. "Fleet & route coordinator" (FE interfaces/enums.ts, ROLE_LABEL). */
    public static String label(String name) {
        return switch (name) {
            case CUSTOMER -> "Customer";
            case LOGISTICS_MANAGER -> "Logistics manager";
            case TRANSPORT_SPECIALIST -> "Transport specialist";
            case FLEET_COORDINATOR -> "Fleet & route coordinator";
            case ESCORT -> "Escort";
            default -> name;
        };
    }
}
