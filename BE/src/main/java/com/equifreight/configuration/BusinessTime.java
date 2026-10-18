package com.equifreight.configuration;

import java.time.ZoneId;

/**
 * The business time zone. Every rule that counts calendar days (lead time, validity windows, due dates,
 * "not in the future") works on dates in this zone, never UTC: a 06:00 departure on 18 Oct is still
 * 17 Oct in UTC.
 */
public final class BusinessTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private BusinessTime() {}
}
