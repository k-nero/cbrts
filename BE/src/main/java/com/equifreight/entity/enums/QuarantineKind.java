package com.equifreight.entity.enums;

/**
 * {@code quarantine_periods.kind}: when in the move a quarantine falls (US-F3-22). {@link
 * com.equifreight.service.QuarantineRules} decides what each kind holds.
 */
public enum QuarantineKind {
    /** Before the horses leave the origin country; holds departure until it is completed. */
    PRE_EXPORT,
    /** After the horses arrive in the destination country. */
    POST_ARRIVAL
}
