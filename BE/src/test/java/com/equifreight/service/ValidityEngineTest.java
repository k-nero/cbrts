package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.equifreight.configuration.AppConstants;
import com.equifreight.entity.*;
import com.equifreight.entity.enums.RegulationRuleKind;
import com.equifreight.entity.enums.Validity;
import java.time.Clock;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** BR-F2-02, BR-F2-10, US-F2-09: each rule shape against the travel dates, with today 20 Oct 2026. */
class ValidityEngineTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 20);

    private ValidityEngine validityEngine;
    private TransportJob job;
    private ChecklistItem checklistItem;
    private DocumentVersion documentVersion;
    private RegulationRule regulationRule;
    private RegulationVersion regulationVersion;

    @BeforeEach
    void setUp() {
        validityEngine = new ValidityEngine(Clock.fixed(
                TODAY.atTime(9, 0).atZone(AppConstants.BUSINESS_ZONE).toInstant(), AppConstants.BUSINESS_ZONE));

        // Simulated job: Departure 2026-11-01, Arrival 2026-11-05 in Asia/Ho_Chi_Minh business zone
        job = new TransportJob();
        job.setPlannedDepartureAt(LocalDate.of(2026, 11, 1)
                .atStartOfDay(AppConstants.BUSINESS_ZONE)
                .toInstant());
        job.setPlannedArrivalAt(LocalDate.of(2026, 11, 5)
                .atStartOfDay(AppConstants.BUSINESS_ZONE)
                .toInstant());

        regulationVersion = new RegulationVersion();
        regulationVersion.setArrivalBufferDays((short) 2);

        regulationRule = new RegulationRule();
        regulationRule.setVersion(regulationVersion);
        regulationRule.setMandatory(true);

        checklistItem = new ChecklistItem();
        checklistItem.setJob(job);
        checklistItem.setRegulationRule(regulationRule);

        documentVersion = new DocumentVersion();
        documentVersion.setChecklistItem(checklistItem);
    }

    @Test
    @DisplayName("returns RED when no document version is uploaded")
    void returnsRedWhenNoVersion() {
        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, null, job);
        assertEquals(Validity.RED, result.validity());
        assertEquals("No document uploaded yet.", result.note());
    }

    @Test
    @DisplayName("PRESENCE_ONLY returns GREEN when document version is present")
    void presenceOnlyReturnsGreen() {
        regulationRule.setRuleKind(RegulationRuleKind.PRESENCE_ONLY);

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.GREEN, result.validity());
    }

    private ValidityEngine.Result evaluate() {
        return validityEngine.evaluate(checklistItem, documentVersion, job);
    }

    private void window(int maxDays) {
        regulationRule.setRuleKind(RegulationRuleKind.WINDOW_BEFORE_DEPARTURE);
        regulationRule.setMaxDays((short) maxDays);
    }

    private void booster(int minDays, int maxDays) {
        regulationRule.setRuleKind(RegulationRuleKind.BOOSTER_WINDOW);
        regulationRule.setMinDays((short) minDays);
        regulationRule.setMaxDays((short) maxDays);
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE passes a test sampled within 60 days of departure")
    void windowBeforeDepartureValid() {
        window(60);
        documentVersion.setSampledOn(LocalDate.of(2026, 10, 10));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.GREEN, result.validity());
        assertEquals("Sampled 10 Oct 2026, 22 days before departure", result.found());
        assertNull(result.renewBy());
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE passes a test right at the edge of its window")
    void windowBeforeDepartureAtTheEdge() {
        window(60);
        documentVersion.setSampledOn(LocalDate.of(2026, 9, 2));

        assertEquals(Validity.GREEN, evaluate().validity());
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE refuses a test already too old today, naming the rule, value and limit")
    void windowBeforeDepartureAlreadyTooOld() {
        window(60);
        documentVersion.setSampledOn(LocalDate.of(2026, 8, 1));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.RED, result.validity());
        assertEquals("Sampled within 60 days before departure", result.rule());
        assertEquals(
                "Sampled 1 Aug 2026: 92 days before your 1 Nov 2026 departure and already 80 days old today",
                result.found());
        assertEquals("sampled on 2 Sep 2026 or later", result.required());
        assertTrue(result.note().endsWith("Needs to be sampled on 2 Sep 2026 or later."));
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE keeps a test valid today but too old at departure, due by the item deadline")
    void windowBeforeDepartureAgesOutInTransit() {
        window(60);
        checklistItem.setDueDate(LocalDate.of(2026, 10, 25));
        documentVersion.setSampledOn(LocalDate.of(2026, 8, 25));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.AMBER, result.validity());
        assertEquals("Sampled 25 Aug 2026: valid until 24 Oct 2026, so 68 days old at departure", result.found());
        assertEquals(LocalDate.of(2026, 10, 25), result.renewBy());
        assertTrue(result.note().endsWith("Replace it by 25 Oct 2026."));
    }

    @Test
    @DisplayName("an AMBER test whose deadline comes before any passing sample is renewed by departure")
    void windowRenewalAfterAnImpossibleDeadline() {
        window(10);
        checklistItem.setDueDate(LocalDate.of(2026, 10, 18));
        documentVersion.setSampledOn(LocalDate.of(2026, 10, 15));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.AMBER, result.validity());
        assertEquals(LocalDate.of(2026, 11, 1), result.renewBy());
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE counts from the issue date when no sample date is given")
    void windowBeforeDepartureFromIssueDate() {
        window(10);
        documentVersion.setIssuedOn(LocalDate.of(2026, 9, 1));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.RED, result.validity());
        assertEquals("Issued within 10 days before departure", result.rule());
        assertEquals("issued on 22 Oct 2026 or later", result.required());
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS passes a passport valid past arrival plus 2 buffer days")
    void validThroughArrivalPlusSatisfied() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        documentVersion.setValidUntil(LocalDate.of(2026, 12, 31));

        assertEquals(Validity.GREEN, evaluate().validity());
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS refuses a document that has already expired")
    void validThroughArrivalPlusAlreadyExpired() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        documentVersion.setValidUntil(LocalDate.of(2026, 10, 15));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.RED, result.validity());
        assertEquals("Valid until at least 2 days after arrival", result.rule());
        assertEquals("Expired on 15 Oct 2026", result.found());
        assertEquals("valid until 7 Nov 2026 or later", result.required());
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS keeps a document that expires mid-journey (BR-F2-10)")
    void validThroughArrivalPlusExpiresInTransit() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        checklistItem.setDueDate(LocalDate.of(2026, 10, 25));
        documentVersion.setValidUntil(LocalDate.of(2026, 11, 3));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.AMBER, result.validity());
        assertEquals("Valid until 3 Nov 2026, before your 5 Nov 2026 arrival + 2 days", result.found());
        assertEquals(LocalDate.of(2026, 10, 25), result.renewBy());
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS keeps a document that runs out inside the buffer")
    void validThroughArrivalPlusExpiredWithinBuffer() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        documentVersion.setValidUntil(LocalDate.of(2026, 11, 6));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.AMBER, result.validity());
        assertEquals(LocalDate.of(2026, 11, 6), result.renewBy());
    }

    @Test
    @DisplayName("BOOSTER_WINDOW passes a vaccine given between 7 and 180 days before departure")
    void boosterWindowValid() {
        booster(7, 180);
        documentVersion.setIssuedOn(LocalDate.of(2026, 10, 2));

        assertEquals(Validity.GREEN, evaluate().validity());
    }

    @Test
    @DisplayName("BOOSTER_WINDOW refuses a vaccine given less than 7 days before departure")
    void boosterWindowTooRecent() {
        booster(7, 180);
        documentVersion.setIssuedOn(LocalDate.of(2026, 10, 30));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.RED, result.validity());
        assertEquals("Given 7–180 days before departure", result.rule());
        assertEquals("given between 5 May 2026 and 25 Oct 2026", result.required());
    }

    @Test
    @DisplayName("BOOSTER_WINDOW refuses a booster that has already lapsed")
    void boosterWindowLapsed() {
        booster(7, 180);
        documentVersion.setIssuedOn(LocalDate.of(2026, 4, 1));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.RED, result.validity());
        assertEquals("Given 1 Apr 2026: the booster lapsed on 28 Sep 2026", result.found());
    }

    @Test
    @DisplayName("BOOSTER_WINDOW keeps a booster that lapses before departure")
    void boosterWindowLapsesBeforeDeparture() {
        booster(7, 180);
        checklistItem.setDueDate(LocalDate.of(2026, 10, 25));
        documentVersion.setIssuedOn(LocalDate.of(2026, 4, 25));

        ValidityEngine.Result result = evaluate();

        assertEquals(Validity.AMBER, result.validity());
        assertEquals(LocalDate.of(2026, 10, 25), result.renewBy());
    }
}
