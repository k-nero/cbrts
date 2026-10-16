package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.model.request.LeadTimeResponse;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * BR-F1-01. A move within one country needs that country's domestic lead time. A cross-border move needs the
 * largest lead time of its destination and every transit country, that is, every country on the route but
 * the origin (core-flows §2.3). Days are calendar days in the business time zone.
 */
public final class LeadTimePolicy {

    private LeadTimePolicy() {}

    /** {@code countryCodes} in travel order; every one has a published version in the map. */
    public static int requiredDays(List<String> countryCodes, Map<String, RegulationVersion> publishedByCountry) {
        if (countryCodes.size() == 1) {
            return publishedByCountry.get(countryCodes.getFirst()).getDomesticLeadTimeDays();
        }
        return countryCodes.subList(1, countryCodes.size()).stream()
                .mapToInt(code -> publishedByCountry.get(code).getLeadTimeDays())
                .max()
                .orElseThrow();
    }

    public static LocalDate earliestDeparture(LocalDate today, int requiredDays) {
        return today.plusDays(requiredDays);
    }

    /** A departure on the earliest date passes; anything earlier, including a past date, is too soon. */
    public static LeadTimeResponse assess(int requiredDays, LocalDate today, LocalDate departure) {
        LocalDate earliest = earliestDeparture(today, requiredDays);
        return LeadTimeResponse.builder()
                .requiredDays(requiredDays)
                .earliestDeparture(earliest)
                .daysBeforeDeparture(ChronoUnit.DAYS.between(today, departure))
                .met(!departure.isBefore(earliest))
                .build();
    }

    public static String tooSoonMessage(boolean crossBorder, int requiredDays, LocalDate earliest) {
        String rule = crossBorder
                ? "Cross-border moves need " + requiredDays + " days for document clearance."
                : "Moves within one country need " + requiredDays + " days' notice.";
        return rule + " The earliest departure is " + BusinessTime.DAY.format(earliest) + ".";
    }
}
