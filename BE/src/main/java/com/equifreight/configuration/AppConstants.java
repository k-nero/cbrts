package com.equifreight.configuration;

import java.time.ZoneId;

/**
 * Shared application constants across all domains (AGENTS.md).
 */
public final class AppConstants {

    private AppConstants() {}

    /**
     * Business rules that count days (validity windows, lead time, due dates)
     * work on dates in the business calendar time zone, never UTC.
     */
    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
}
