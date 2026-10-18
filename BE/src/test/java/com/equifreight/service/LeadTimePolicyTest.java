package com.equifreight.service;

import com.equifreight.entity.RegulationVersion;
import com.equifreight.model.request.LeadTimeResponse;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** BR-F1-01: the lead time of the destination and every transit country, or the domestic one. */
class LeadTimePolicyTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26);

    @Test
    void aDomesticMoveNeedsTheCountrysDomesticLeadTime() {
        assertThat(LeadTimePolicy.requiredDays(List.of("VN"), Map.of("VN", version(21, 3)))).isEqualTo(3);
    }

    @Test
    void aCrossBorderMoveNeedsTheDestinationsLeadTime() {
        assertThat(LeadTimePolicy.requiredDays(List.of("VN", "KH", "TH"),
                Map.of("VN", version(21, 3), "KH", version(21, 3), "TH", version(21, 3)))).isEqualTo(21);
    }

    @Test
    void laosAsTheDestinationNeeds30() {
        assertThat(LeadTimePolicy.requiredDays(List.of("VN", "LA"),
                Map.of("VN", version(21, 3), "LA", version(30, 3)))).isEqualTo(30);
    }

    @Test
    void aTransitCountryCanRaiseTheLeadTime() {
        assertThat(LeadTimePolicy.requiredDays(List.of("VN", "KH", "TH"),
                Map.of("VN", version(21, 3), "KH", version(25, 3), "TH", version(21, 3)))).isEqualTo(25);
    }

    @Test
    void theOriginsLeadTimeDoesNotCount() {
        assertThat(LeadTimePolicy.requiredDays(List.of("LA", "TH"),
                Map.of("LA", version(30, 3), "TH", version(21, 3)))).isEqualTo(21);
    }

    @Test
    void theEarliestDepartureIsTodayPlusTheLeadTime() {
        assertThat(LeadTimePolicy.earliestDeparture(TODAY, 21)).isEqualTo(LocalDate.of(2026, 10, 17));
    }

    @Test
    void aDepartureOnTheEarliestDatePasses() {
        LeadTimeResponse result = LeadTimePolicy.assess(21, TODAY, LocalDate.of(2026, 10, 17));

        assertThat(result.isMet()).isTrue();
        assertThat(result.getRequiredDays()).isEqualTo(21);
        assertThat(result.getEarliestDeparture()).isEqualTo(LocalDate.of(2026, 10, 17));
        assertThat(result.getDaysBeforeDeparture()).isEqualTo(21);
    }

    @Test
    void aDayEarlierIsTooSoon() {
        assertThat(LeadTimePolicy.assess(21, TODAY, LocalDate.of(2026, 10, 16)).isMet()).isFalse();
    }

    @Test
    void aPastDepartureIsTooSoon() {
        LeadTimeResponse result = LeadTimePolicy.assess(21, TODAY, LocalDate.of(2026, 9, 20));

        assertThat(result.isMet()).isFalse();
        assertThat(result.getDaysBeforeDeparture()).isEqualTo(-6);
    }

    @Test
    void theMessagesNameTheDaysAndTheDate() {
        assertThat(LeadTimePolicy.tooSoonMessage(true, 21, LocalDate.of(2026, 10, 17))).isEqualTo(
                "Cross-border moves need 21 days for document clearance. The earliest departure is 17 Oct 2026.");
        assertThat(LeadTimePolicy.tooSoonMessage(false, 3, LocalDate.of(2026, 9, 29))).isEqualTo(
                "Moves within one country need 3 days' notice. The earliest departure is 29 Sep 2026.");
    }

    @Test
    void datesThatCanMoveMoveTheEarliestDepartureByTheFlex() {
        assertThat(LeadTimePolicy.earliestDeparture(TODAY, 21, 3)).isEqualTo(LocalDate.of(2026, 10, 20));
    }

    @Test
    void withFlexibleDatesTheFixedDateEarliestIsTooSoon() {
        LeadTimeResponse result = LeadTimePolicy.assess(21, 3, TODAY, LocalDate.of(2026, 10, 17));

        assertThat(result.isMet()).isFalse();
        assertThat(result.getRequiredDays()).isEqualTo(21);
        assertThat(result.getEarliestDeparture()).isEqualTo(LocalDate.of(2026, 10, 20));
    }

    @Test
    void withFlexibleDatesTheMovedEarliestPasses() {
        assertThat(LeadTimePolicy.assess(21, 3, TODAY, LocalDate.of(2026, 10, 20)).isMet()).isTrue();
    }

    @Test
    void theFlexibleDatesMessageSaysWhyTheDateIsLater() {
        assertThat(LeadTimePolicy.tooSoonMessage(true, 21, 3, LocalDate.of(2026, 10, 20))).isEqualTo(
                "Cross-border moves need 21 days for document clearance. With dates that can move by ±3 days, "
                        + "the earliest departure is 20 Oct 2026.");
    }

    private static RegulationVersion version(int crossBorder, int domestic) {
        RegulationVersion v = new RegulationVersion();
        v.setLeadTimeDays((short) crossBorder);
        v.setDomesticLeadTimeDays((short) domestic);
        return v;
    }
}
