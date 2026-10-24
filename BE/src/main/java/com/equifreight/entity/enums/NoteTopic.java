package com.equifreight.entity.enums;

/**
 * {@code notes.topic}: decides who answers (US-00-08). Documents go to the transport specialist; dates, price and
 * changes to the logistics manager; the trip to the fleet & route coordinator. Anything else goes to the logistics
 * manager, who reads every note.
 */
public enum NoteTopic {
    DOCUMENTS(RoleName.TRANSPORT_SPECIALIST),
    DATES_PRICE_CHANGES(RoleName.LOGISTICS_MANAGER),
    TRIP(RoleName.FLEET_COORDINATOR),
    OTHER(RoleName.LOGISTICS_MANAGER);

    private final String routedRole;

    NoteTopic(String routedRole) {
        this.routedRole = routedRole;
    }

    /** The {@link RoleName} that answers a note on this topic. */
    public String routedRole() {
        return routedRole;
    }
}
