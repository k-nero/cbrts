package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.request.LeadTimeResponse;
import com.equifreight.model.review.CheckResponse;
import com.equifreight.model.route.CrossingResponse;
import com.equifreight.model.route.RouteResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * The feasibility checks the review page can work out today (spec §4.4): is the route still one we run, and
 * was the request made in time. Blackout, capacity and horse availability come with later slices.
 */
public final class ReviewChecks {

    private ReviewChecks() {}

    public static CheckResponse routeServed(RouteResponse route) {
        if (route == null) {
            return check("ROUTE_SERVED", false, "Not served", "This route is no longer in the catalog.", null);
        }
        List<String> names = route.getCountryNames() != null ? route.getCountryNames()
                : route.getCountries() != null ? route.getCountries() : List.of();
        String path = String.join(" → ", names);
        String evidence;
        if (route.getMode() == TransportMode.AIR) {
            evidence = path + " by air.";
        } else if (names.size() <= 1) {
            evidence = "Within " + path + " by road.";
        } else {
            evidence = path + " via " + listOf(route.getCrossings().stream().map(CrossingResponse::getName).toList())
                    + ".";
        }
        return check("ROUTE_SERVED", true, "Served", evidence, null);
    }

    /** BR-F1-01, counted from the day the request was (last) submitted, in business time. */
    public static CheckResponse leadTime(RouteResponse route, LocalDate submittedDay, LocalDate departure,
                                         LocalDate today) {
        if (route == null) {
            return check("LEAD_TIME", false, "Unknown", "There is no lead time without a route we run.", null);
        }
        if (route.getLeadTimeDays() == null) {
            return check("LEAD_TIME", false, "Unknown", "No published regulations for this route yet.", null);
        }
        int required = route.getLeadTimeDays();
        LeadTimeResponse lead = LeadTimePolicy.assess(required, submittedDay, departure);
        String evidence = "Submitted " + days(lead.getDaysBeforeDeparture()) + " before departure; " + required
                + " required for a " + (Boolean.FALSE.equals(route.getCrossBorder()) ? "domestic" : "cross-border")
                + " move.";
        if (!lead.isMet()) {
            evidence += " The earliest departure is " + BusinessTime.DAY.format(lead.getEarliestDeparture()) + ".";
        }
        long left = ChronoUnit.DAYS.between(today, departure);
        String sub = left > 0 ? "Departs in " + days(left) + "." : left == 0 ? "Departs today."
                : "Departed " + days(-left) + " ago.";
        return check("LEAD_TIME", lead.isMet(), lead.isMet() ? "Met" : "Too short", evidence, sub);
    }

    /** The calendar day of a submission in Asia/Ho_Chi_Minh: 18:30 UTC is already the next day. */
    public static LocalDate submittedDay(Instant submittedAt) {
        return LocalDate.ofInstant(submittedAt, BusinessTime.ZONE);
    }

    private static CheckResponse check(String key, boolean ok, String word, String evidence, String sub) {
        return CheckResponse.builder().key(key).state(ok ? "OK" : "BAD").word(word).evidence(evidence).sub(sub)
                .build();
    }

    /** "1 day", "34 days". */
    private static String days(long n) {
        return n + (n == 1 ? " day" : " days");
    }

    /** "A", "A and B", "A, B and C". */
    private static String listOf(List<String> items) {
        if (items.size() <= 1) {
            return String.join("", items);
        }
        return String.join(", ", items.subList(0, items.size() - 1)) + " and " + items.getLast();
    }
}
