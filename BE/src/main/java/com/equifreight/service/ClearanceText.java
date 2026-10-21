package com.equifreight.service;

import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.SubmissionKind;
import com.equifreight.entity.enums.Validity;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** The clearance gate's outstanding issues in words: the screens show them as written, never a raw enum. */
public final class ClearanceText {
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private ClearanceText() {}

    /** "Export health certificates", as a dossier is named on the Authorities page. */
    public static String submission(SubmissionKind kind) {
        return switch (kind) {
            case EXPORT_HEALTH_CERTS -> "Export health certificates";
            case IMPORT_PERMIT -> "Import permit";
            case CUSTOMS_DOSSIER -> "Customs dossier";
        };
    }

    public static String status(ChecklistStatus status) {
        return switch (status) {
            case NOT_ISSUED -> "not issued yet";
            case AWAITING_UPLOAD -> "waiting for upload";
            case IN_REVIEW -> "in review";
            case CLEARED -> "cleared";
            case REJECTED -> "rejected";
            case WITH_AUTHORITY -> "with the authority";
        };
    }

    public static String validity(Validity validity) {
        return validity == null ? "not checked" : validity.name().toLowerCase(Locale.ROOT);
    }

    public static String day(LocalDate date) {
        return date == null ? "an open date" : DAY.format(date);
    }
}
