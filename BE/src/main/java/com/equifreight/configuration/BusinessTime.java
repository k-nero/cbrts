package com.equifreight.configuration;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * The business time zone. Every rule that counts calendar days (lead time, validity windows, due dates,
 * "not in the future") works on dates in this zone, never UTC: a 06:00 departure on 18 Oct is still
 * 17 Oct in UTC.
 */
public final class BusinessTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /**
     * A date in messages: "17 Oct 2026".
     */
    public static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    /**
     * A date inside a sentence about one trip: "29 Oct".
     */
    public static final DateTimeFormatter SHORT_DAY = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);

    private BusinessTime() {
    }
}
