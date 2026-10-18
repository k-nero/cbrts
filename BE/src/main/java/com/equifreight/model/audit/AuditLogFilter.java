package com.equifreight.model.audit;

import java.time.LocalDate;

/**
 * The audit log filters (US-00-06). {@code q} matches the entity code, the person and the summary;
 * {@code actor} is a user id or {@code SYSTEM} for entries without an account; {@code from} and
 * {@code to} are inclusive calendar days in the business time zone. Every field is optional.
 */
public record AuditLogFilter(String q, String actor, String action, LocalDate from, LocalDate to) {

    /**
     * The Person filter value for entries no account made (the system, someone not signed in).
     */
    public static final String SYSTEM_ACTOR = "SYSTEM";
}
