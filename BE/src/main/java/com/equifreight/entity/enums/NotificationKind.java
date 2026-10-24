package com.equifreight.entity.enums;

/**
 * {@code notifications.kind}: what happened. The caller writes the text; the kind decides the tone the bell shows.
 */
public enum NotificationKind {
    REQUEST_INFO_REQUIRED(NotificationTone.WARN),
    REQUEST_CANCELLED(NotificationTone.NEUTRAL),
    REQUEST_REJECTED(NotificationTone.BAD),
    REQUEST_APPROVED(NotificationTone.OK),
    QUOTATION_ISSUED(NotificationTone.INFO),
    QUOTATION_EXPIRING(NotificationTone.WARN),
    QUOTATION_EXPIRED(NotificationTone.WARN),
    QUOTATION_ACCEPTED(NotificationTone.OK),
    QUOTATION_DECLINED(NotificationTone.NEUTRAL),
    JOB_ASSIGNED(NotificationTone.INFO),
    AUTHORITY_INFO_REQUIRED(NotificationTone.WARN),
    DOSSIER_BLOCKED(NotificationTone.WARN),
    DOSSIER_REFUSED(NotificationTone.BAD),
    DOSSIER_LATE(NotificationTone.WARN),
    DOCUMENTS_DUE(NotificationTone.WARN),
    TRIP_RELEASED(NotificationTone.INFO),
    TRIP_HELD(NotificationTone.BAD),
    TRIP_SHARED(NotificationTone.INFO),
    TRIP_TIMES_CHANGED(NotificationTone.WARN),
    JOB_REPLANNED(NotificationTone.WARN),
    INCIDENT_RAISED(NotificationTone.BAD),
    INCIDENT_PROPOSAL(NotificationTone.WARN),
    INCIDENT_DECIDED(NotificationTone.OK),
    INCIDENT_RETURNED(NotificationTone.WARN),
    INCIDENT_UPDATE(NotificationTone.WARN),
    DELAY_ALERT(NotificationTone.WARN),
    INCIDENT_RESOLVED(NotificationTone.OK),
    HANDOVER_ACCEPTED(NotificationTone.OK),
    INVOICE_ISSUED(NotificationTone.INFO),
    PAYMENT_RECORDED(NotificationTone.OK);

    private final NotificationTone tone;

    NotificationKind(NotificationTone tone) {
        this.tone = tone;
    }

    public NotificationTone tone() {
        return tone;
    }
}
