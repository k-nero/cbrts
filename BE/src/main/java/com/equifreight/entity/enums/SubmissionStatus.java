package com.equifreight.entity.enums;

/** {@code authority_submissions.status}. "Overdue" is computed from {@code expected_by}. */
public enum SubmissionStatus {
    READY_TO_FILE, FILED, ADDITIONAL_INFO, ISSUED, REFUSED
}
