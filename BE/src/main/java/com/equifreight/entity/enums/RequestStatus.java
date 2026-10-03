package com.equifreight.entity.enums;

/** {@code transport_requests.status}: the Flow 1 state machine. */
public enum RequestStatus {
    DRAFT, SUBMITTED, UNDER_REVIEW, INFO_REQUIRED, QUOTED, CUSTOMER_ACCEPTED, APPROVED, REJECTED, EXPIRED, CANCELLED
}
