package com.equifreight.entity.enums;

/**
 * {@code notifications.entity_type}: the kind of record a notification is about and links to.
 */
public enum NotificationSubject {
    TRANSPORT_REQUEST,
    QUOTATION,
    TRANSPORT_JOB,
    AUTHORITY_SUBMISSION,
    /** A job's document checklist as a whole. */
    DOCUMENTS,
    /** A job's trip as it is followed: the customer's tracking, the staff Trip tab, the escort's cab. */
    TRIP_TRACKING,
    /** An incident: the staff incident page. */
    INCIDENT
}
