package com.equifreight.service;

/** Lines written to audit_log, whose summary column is varchar(500). */
public final class AuditText {

    /** audit_log.summary is varchar(500). */
    public static final int MAX = 500;

    private AuditText() {}

    /** The line as it is, or cut to fit and ending in "…", never splitting a character in two. */
    public static String fit(String summary) {
        if (summary.length() <= MAX) {
            return summary;
        }
        int end = MAX - 1;
        if (Character.isHighSurrogate(summary.charAt(end - 1))) {
            end--;
        }
        return summary.substring(0, end) + "…";
    }
}
