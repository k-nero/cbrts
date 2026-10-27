package com.equifreight.entity.enums;

/**
 * {@code notifications.kind}: what happened. The caller writes the text; the kind decides the tone the bell shows.
 */
public enum NotificationKind {
    /** A club submitted a request, or sent it again after a return; the logistics managers review it (§2.3). */
    REQUEST_SUBMITTED(NotificationTone.INFO),
    REQUEST_INFO_REQUIRED(NotificationTone.WARN),
    REQUEST_CANCELLED(NotificationTone.NEUTRAL),
    REQUEST_REJECTED(NotificationTone.BAD),
    REQUEST_APPROVED(NotificationTone.OK),
    QUOTATION_ISSUED(NotificationTone.INFO),
    QUOTATION_EXPIRING(NotificationTone.WARN),
    QUOTATION_EXPIRED(NotificationTone.WARN),
    QUOTATION_ACCEPTED(NotificationTone.OK),
    QUOTATION_DECLINED(NotificationTone.NEUTRAL),
    /** The customer asked for a re-quote of an expired quotation; the next version is drafted (A4). */
    QUOTATION_REQUOTE_ASKED(NotificationTone.INFO),
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
    /** The horses cleared customs at a border (US-F4-05). */
    HORSES_CLEARED_CUSTOMS(NotificationTone.INFO),
    /** The horses reached the handover point (US-F4-05). */
    HORSES_ARRIVED(NotificationTone.OK),
    INCIDENT_RAISED(NotificationTone.BAD),
    INCIDENT_PROPOSAL(NotificationTone.WARN),
    INCIDENT_DECIDED(NotificationTone.OK),
    INCIDENT_RETURNED(NotificationTone.WARN),
    INCIDENT_UPDATE(NotificationTone.WARN),
    DELAY_ALERT(NotificationTone.WARN),
    INCIDENT_RESOLVED(NotificationTone.OK),
    HANDOVER_ACCEPTED(NotificationTone.OK),
    INVOICE_ISSUED(NotificationTone.INFO),
    PAYMENT_RECORDED(NotificationTone.OK),
    /** A customer note routed to the role that answers it (US-00-08). */
    NOTE_RECEIVED(NotificationTone.INFO),
    /** Staff replied to the customer's note. */
    NOTE_ANSWERED(NotificationTone.OK);

    private final NotificationTone tone;

    NotificationKind(NotificationTone tone) {
        this.tone = tone;
    }

    public NotificationTone tone() {
        return tone;
    }
}
