package com.equifreight.service;

import com.equifreight.entity.enums.TransportMode;
import com.equifreight.model.review.CheckResponse;
import com.equifreight.model.route.CrossingResponse;
import com.equifreight.model.route.RouteResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Spec §4.4: the two feasibility checks the review page can work out today. */
class ReviewChecksTest {

    static final LocalDate TODAY = LocalDate.of(2026, 9, 28);

    static RouteResponse road(List<String> countries, List<String> crossings, boolean crossBorder, int leadTime) {
        return RouteResponse.builder().mode(TransportMode.ROAD).countries(countries)
                .countryNames(countries.stream().map(ReviewChecksTest::name).toList()).crossBorder(crossBorder)
                .crossings(crossings.stream().map(n -> CrossingResponse.builder().name(n).build()).toList())
                .leadTimeDays(leadTime).build();
    }

    @Test
    void aRoadRouteIsServedWithItsCrossings() {
        CheckResponse check = ReviewChecks.routeServed(road(List.of("VN", "KH", "TH"),
                List.of("Mộc Bài – Bavet", "Poipet – Aranyaprathet"), true, 21));

        assertThat(check.getKey()).isEqualTo("ROUTE_SERVED");
        assertThat(check.getState()).isEqualTo("OK");
        assertThat(check.getWord()).isEqualTo("Served");
        assertThat(check.getEvidence())
                .isEqualTo("Vietnam → Cambodia → Thailand via Mộc Bài – Bavet and Poipet – Aranyaprathet.");
    }

    @Test
    void anAirRouteIsServedByAir() {
        RouteResponse air = RouteResponse.builder().mode(TransportMode.AIR).countries(List.of("VN", "HK"))
                .countryNames(List.of("Vietnam", "Hong Kong"))
                .crossings(List.of()).crossBorder(true).leadTimeDays(21).build();

        assertThat(ReviewChecks.routeServed(air).getEvidence()).isEqualTo("Vietnam → Hong Kong by air.");
    }

    @Test
    void aDomesticRoadRouteSaysWithin() {
        assertThat(ReviewChecks.routeServed(road(List.of("VN"), List.of(), false, 3)).getEvidence())
                .isEqualTo("Within Vietnam by road.");
    }

    @Test
    void aRouteWithoutNamesFallsBackToItsCodes() {
        RouteResponse bare = RouteResponse.builder().mode(TransportMode.ROAD).countries(List.of("VN", "KH"))
                .crossings(List.of(CrossingResponse.builder().name("Mộc Bài – Bavet").build())).build();

        assertThat(ReviewChecks.routeServed(bare).getEvidence()).isEqualTo("VN → KH via Mộc Bài – Bavet.");
    }

    static String name(String code) {
        return switch (code) {
            case "VN" -> "Vietnam";
            case "KH" -> "Cambodia";
            case "TH" -> "Thailand";
            case "LA" -> "Laos";
            case "MY" -> "Malaysia";
            default -> "Hong Kong";
        };
    }

    @Test
    void aRouteNoLongerInTheCatalogIsNotServed() {
        CheckResponse check = ReviewChecks.routeServed(null);

        assertThat(check.getState()).isEqualTo("BAD");
        assertThat(check.getWord()).isEqualTo("Not served");
        assertThat(check.getEvidence()).isEqualTo("This route is no longer in the catalog.");
    }

    @Test
    void leadTimeMet() {
        CheckResponse check = ReviewChecks.leadTime(road(List.of("VN", "TH"), List.of(), true, 21),
                LocalDate.of(2026, 9, 26), LocalDate.of(2026, 10, 30), TODAY);

        assertThat(check.getKey()).isEqualTo("LEAD_TIME");
        assertThat(check.getState()).isEqualTo("OK");
        assertThat(check.getWord()).isEqualTo("Met");
        assertThat(check.getEvidence())
                .isEqualTo("Submitted 34 days before departure; 21 required for a cross-border move.");
        assertThat(check.getSub()).isEqualTo("Departs in 32 days.");
    }

    @Test
    void leadTimeTooShort() {
        CheckResponse check = ReviewChecks.leadTime(road(List.of("VN", "LA"), List.of(), true, 30),
                LocalDate.of(2026, 9, 25), LocalDate.of(2026, 10, 20), TODAY);

        assertThat(check.getState()).isEqualTo("BAD");
        assertThat(check.getWord()).isEqualTo("Too short");
        assertThat(check.getEvidence()).isEqualTo("Submitted 25 days before departure; 30 required for a "
                + "cross-border move. The earliest departure is 25 Oct 2026.");
    }

    @Test
    void aDomesticMoveSaysDomestic() {
        CheckResponse check = ReviewChecks.leadTime(road(List.of("VN"), List.of(), false, 3),
                LocalDate.of(2026, 9, 26), LocalDate.of(2026, 10, 30), TODAY);

        assertThat(check.getEvidence()).isEqualTo("Submitted 34 days before departure; 3 required for a domestic move.");
    }

    @Test
    void oneDayIsSingular() {
        CheckResponse check = ReviewChecks.leadTime(road(List.of("VN"), List.of(), false, 1),
                LocalDate.of(2026, 9, 27), LocalDate.of(2026, 9, 29), TODAY);

        assertThat(check.getSub()).isEqualTo("Departs in 1 day.");
        assertThat(ReviewChecks.leadTime(road(List.of("VN"), List.of(), false, 1), LocalDate.of(2026, 9, 28),
                LocalDate.of(2026, 9, 29), TODAY).getEvidence())
                .startsWith("Submitted 1 day before departure;");
    }

    @Test
    void aDepartureTodayOrPastSaysSo() {
        RouteResponse route = road(List.of("VN"), List.of(), false, 3);

        assertThat(ReviewChecks.leadTime(route, LocalDate.of(2026, 9, 20), TODAY, TODAY).getSub())
                .isEqualTo("Departs today.");
        assertThat(ReviewChecks.leadTime(route, LocalDate.of(2026, 9, 20), LocalDate.of(2026, 9, 26), TODAY)
                .getSub()).isEqualTo("Departed 2 days ago.");
    }

    @Test
    void aServedRouteWithoutPublishedRulesHasNoLeadTimeYet() {
        RouteResponse served = RouteResponse.builder().mode(TransportMode.ROAD).countries(List.of("VN", "LA"))
                .crossings(List.of()).crossBorder(true).build();

        CheckResponse check = ReviewChecks.leadTime(served, LocalDate.of(2026, 9, 26), LocalDate.of(2026, 10, 30),
                TODAY);

        assertThat(check.getState()).isEqualTo("BAD");
        assertThat(check.getWord()).isEqualTo("Unknown");
        assertThat(check.getEvidence()).isEqualTo("No published regulations for this route yet.");
    }

    @Test
    void noLeadTimeWithoutARoute() {
        CheckResponse check = ReviewChecks.leadTime(null, LocalDate.of(2026, 9, 26), LocalDate.of(2026, 10, 30),
                TODAY);

        assertThat(check.getState()).isEqualTo("BAD");
        assertThat(check.getWord()).isEqualTo("Unknown");
        assertThat(check.getEvidence()).isEqualTo("There is no lead time without a route we run.");
    }

    @Test
    void theSubmissionDayIsTheBusinessDay() {
        assertThat(ReviewChecks.submittedDay(Instant.parse("2026-09-25T18:30:00Z"))).isEqualTo(LocalDate.of(2026, 9, 26));
    }
}
