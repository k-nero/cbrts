package com.equifreight.service;

import com.equifreight.configuration.AppConstants;
import com.equifreight.entity.*;
import com.equifreight.entity.enums.RegulationRuleKind;
import com.equifreight.entity.enums.Validity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class ValidityEngineTest {

    private ValidityEngine validityEngine;
    private TransportJob job;
    private ChecklistItem checklistItem;
    private DocumentVersion documentVersion;
    private RegulationRule regulationRule;
    private RegulationVersion regulationVersion;

    @BeforeEach
    void setUp() {
        validityEngine = new ValidityEngine();

        // Simulated job: Departure 2026-11-01, Arrival 2026-11-05 in Asia/Ho_Chi_Minh business zone
        job = new TransportJob();
        job.setPlannedDepartureAt(LocalDate.of(2026, 11, 1).atStartOfDay(AppConstants.BUSINESS_ZONE).toInstant());
        job.setPlannedArrivalAt(LocalDate.of(2026, 11, 5).atStartOfDay(AppConstants.BUSINESS_ZONE).toInstant());

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

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE returns GREEN when test sampled within 60 days before departure")
    void windowBeforeDepartureValid() {
        regulationRule.setRuleKind(RegulationRuleKind.WINDOW_BEFORE_DEPARTURE);
        regulationRule.setMaxDays((short) 60);

        // Sampled on 2026-10-10 (22 days before departure, <= 60 days)
        documentVersion.setSampledOn(LocalDate.of(2026, 10, 10));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.GREEN, result.validity());
        assertTrue(result.note().contains("within allowed window"));
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE returns RED when test sampled beyond 60 days before departure")
    void windowBeforeDepartureExpired() {
        regulationRule.setRuleKind(RegulationRuleKind.WINDOW_BEFORE_DEPARTURE);
        regulationRule.setMaxDays((short) 60);

        // Sampled on 2026-08-01 (92 days before departure > 60 days)
        documentVersion.setSampledOn(LocalDate.of(2026, 8, 1));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.RED, result.validity());
        assertTrue(result.note().contains("Expired"));
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE returns AMBER when within 3 days of expiration window")
    void windowBeforeDepartureNearExpiry() {
        regulationRule.setRuleKind(RegulationRuleKind.WINDOW_BEFORE_DEPARTURE);
        regulationRule.setMaxDays((short) 60);

        // Sampled on 2026-09-03 (59 days before departure, near the 60-day threshold)
        documentVersion.setSampledOn(LocalDate.of(2026, 9, 3));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.AMBER, result.validity());
        assertTrue(result.note().contains("nearing expiration window"));
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS returns GREEN when passport valid past arrival plus 2 buffer days")
    void validThroughArrivalPlusSatisfied() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        // Arrival 2026-11-05 + 2 days buffer = 2026-11-07; valid until 2026-12-31
        documentVersion.setValidUntil(LocalDate.of(2026, 12, 31));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.GREEN, result.validity());
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS returns RED when passport expires before planned arrival")
    void validThroughArrivalPlusExpiredBeforeArrival() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        // Expires 2026-11-03 before arrival on 2026-11-05
        documentVersion.setValidUntil(LocalDate.of(2026, 11, 3));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.RED, result.validity());
        assertTrue(result.note().contains("before planned arrival"));
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS returns AMBER when valid at arrival but expires inside buffer")
    void validThroughArrivalPlusExpiredWithinBuffer() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        // Arrival 2026-11-05, buffer requires 2026-11-07, expires on 2026-11-06
        documentVersion.setValidUntil(LocalDate.of(2026, 11, 6));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.AMBER, result.validity());
        assertTrue(result.note().contains("mandatory buffer"));
    }

    @Test
    @DisplayName("BOOSTER_WINDOW returns GREEN when vaccine administered between 7 and 180 days before departure")
    void boosterWindowValid() {
        regulationRule.setRuleKind(RegulationRuleKind.BOOSTER_WINDOW);
        regulationRule.setMinDays((short) 7);
        regulationRule.setMaxDays((short) 180);

        // Vaccinated 30 days before departure (2026-10-02)
        documentVersion.setIssuedOn(LocalDate.of(2026, 10, 2));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.GREEN, result.validity());
    }

    @Test
    @DisplayName("BOOSTER_WINDOW returns RED when vaccine administered less than 7 days before departure")
    void boosterWindowTooRecent() {
        regulationRule.setRuleKind(RegulationRuleKind.BOOSTER_WINDOW);
        regulationRule.setMinDays((short) 7);
        regulationRule.setMaxDays((short) 180);

        // Vaccinated on 2026-10-30 (2 days before departure, < 7 minimum)
        documentVersion.setIssuedOn(LocalDate.of(2026, 10, 30));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.RED, result.validity());
        assertTrue(result.note().contains("minimum 7 days"));
    }
}
