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
    DOCUMENTS
}
