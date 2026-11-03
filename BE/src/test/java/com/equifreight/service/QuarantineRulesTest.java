package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.*;

import com.equifreight.entity.QuarantinePeriod;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.enums.QuarantineKind;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** A quarantine's kind as {@link QuarantineRules} reads it (US-F3-22): the same for every origin today. */
class QuarantineRulesTest {

    private final QuarantineRules rules = new QuarantineRules(null);

    private static QuarantinePeriod quarantine(QuarantineKind kind) {
        QuarantinePeriod quarantine = new QuarantinePeriod();
        quarantine.setKind(kind);
        return quarantine;
    }

    @Test
    @DisplayName("A quarantine is pre-export unless set")
    void aQuarantineIsPreExportByDefault() {
        assertEquals(QuarantineKind.PRE_EXPORT, new QuarantinePeriod().getKind());
    }

    @Test
    @DisplayName("Only a pre-export quarantine holds departure")
    void onlyAPreExportQuarantineHoldsDeparture() {
        assertTrue(rules.holdsDeparture(quarantine(QuarantineKind.PRE_EXPORT)));
        assertFalse(rules.holdsDeparture(quarantine(QuarantineKind.POST_ARRIVAL)));
    }

    @Test
    @DisplayName("Either kind lasts at least the pinned destination's minimum")
    void eitherKindTakesTheDestinationMinimum() {
        RegulationVersion destination = new RegulationVersion();
        destination.setQuarantineMinDays((short) 14);

        assertEquals(14, rules.minimumDays(QuarantineKind.PRE_EXPORT, destination));
        assertEquals(14, rules.minimumDays(QuarantineKind.POST_ARRIVAL, destination));
    }
}
