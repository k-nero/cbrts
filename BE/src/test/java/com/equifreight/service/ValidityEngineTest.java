package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.RegulationRuleKind;
import com.equifreight.entity.enums.Validity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

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

        // Giả lập chuyến đi: Khởi hành 2026-11-01, đến nơi 2026-11-05
        job = new TransportJob();
        job.setPlannedDepartureAt(LocalDate.of(2026, 11, 1).atStartOfDay().toInstant(ZoneOffset.UTC));
        job.setPlannedArrivalAt(LocalDate.of(2026, 11, 5).atStartOfDay().toInstant(ZoneOffset.UTC));

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
    @DisplayName("Nếu chưa có file upload thì trả về RED")
    void returnsRedWhenNoVersion() {
        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, null, job);
        assertEquals(Validity.RED, result.validity());
    }

    @Test
    @DisplayName("PRESENCE_ONLY: Có file là đạt GREEN")
    void presenceOnlyReturnsGreen() {
        regulationRule.setRuleKind(RegulationRuleKind.PRESENCE_ONLY);

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.GREEN, result.validity());
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE: Xét nghiệm EIA trong khung 60 ngày -> GREEN")
    void windowBeforeDepartureValid() {
        regulationRule.setRuleKind(RegulationRuleKind.WINDOW_BEFORE_DEPARTURE);
        regulationRule.setMaxDays((short) 60);

        // Lấy mẫu ngày 2026-10-10 (trước ngày 1/11 là 22 ngày, <= 60 ngày)
        documentVersion.setSampledOn(LocalDate.of(2026, 10, 10));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.GREEN, result.validity());
        assertTrue(result.note().contains("trong khung cho phép"));
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE: Xét nghiệm quá 60 ngày trước khởi hành -> RED")
    void windowBeforeDepartureExpired() {
        regulationRule.setRuleKind(RegulationRuleKind.WINDOW_BEFORE_DEPARTURE);
        regulationRule.setMaxDays((short) 60);

        // Lấy mẫu ngày 2026-08-01 (trước ngày 1/11 là 92 ngày > 60 ngày)
        documentVersion.setSampledOn(LocalDate.of(2026, 8, 1));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.RED, result.validity());
        assertTrue(result.note().contains("Đã quá hạn"));
    }

    @Test
    @DisplayName("WINDOW_BEFORE_DEPARTURE: Sát hạn trong vòng 3 ngày -> AMBER")
    void windowBeforeDepartureNearExpiry() {
        regulationRule.setRuleKind(RegulationRuleKind.WINDOW_BEFORE_DEPARTURE);
        regulationRule.setMaxDays((short) 60);

        // Lấy mẫu ngày 2026-09-03 (trước 1/11 đúng 59 ngày, sắp chạm mốc 60)
        documentVersion.setSampledOn(LocalDate.of(2026, 9, 3));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.AMBER, result.validity());
        assertTrue(result.note().contains("sắp hết hạn"));
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS: Hộ chiếu còn hạn qua ngày đến + 2 ngày buffer -> GREEN")
    void validThroughArrivalPlusSatisfied() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        // Ngày đến là 2026-11-05, buffer 2 ngày => cần còn hạn ít nhất đến 2026-11-07
        documentVersion.setValidUntil(LocalDate.of(2026, 12, 31));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.GREEN, result.validity());
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS: Hết hạn trước ngày đến -> RED")
    void validThroughArrivalPlusExpiredBeforeArrival() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        // Hết hạn 2026-11-03, trước ngày đến 2026-11-05
        documentVersion.setValidUntil(LocalDate.of(2026, 11, 3));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.RED, result.validity());
        assertTrue(result.note().contains("trước ngày đến dự kiến"));
    }

    @Test
    @DisplayName("VALID_THROUGH_ARRIVAL_PLUS: Còn hạn ngày đến nhưng không đủ buffer an toàn -> AMBER")
    void validThroughArrivalPlusExpiredWithinBuffer() {
        regulationRule.setRuleKind(RegulationRuleKind.VALID_THROUGH_ARRIVAL_PLUS);
        // Đến ngày 2026-11-05, buffer 2 ngày (cần 2026-11-07), nhưng hết hạn ngày 2026-11-06
        documentVersion.setValidUntil(LocalDate.of(2026, 11, 6));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.AMBER, result.validity());
        assertTrue(result.note().contains("thời gian đệm an toàn"));
    }

    @Test
    @DisplayName("BOOSTER_WINDOW: Tiêm vắc-xin cúm trong khoảng 7 đến 180 ngày -> GREEN")
    void boosterWindowValid() {
        regulationRule.setRuleKind(RegulationRuleKind.BOOSTER_WINDOW);
        regulationRule.setMinDays((short) 7);
        regulationRule.setMaxDays((short) 180);

        // Tiêm trước khởi hành 30 ngày (2026-10-02)
        documentVersion.setIssuedOn(LocalDate.of(2026, 10, 2));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.GREEN, result.validity());
    }

    @Test
    @DisplayName("BOOSTER_WINDOW: Tiêm quá gấp (< 7 ngày trước khởi hành) chưa đủ kháng thể -> RED")
    void boosterWindowTooRecent() {
        regulationRule.setRuleKind(RegulationRuleKind.BOOSTER_WINDOW);
        regulationRule.setMinDays((short) 7);
        regulationRule.setMaxDays((short) 180);

        // Tiêm ngày 2026-10-30 (trước 1/11 chỉ 2 ngày)
        documentVersion.setIssuedOn(LocalDate.of(2026, 10, 30));

        ValidityEngine.Result result = validityEngine.evaluate(checklistItem, documentVersion, job);
        assertEquals(Validity.RED, result.validity());
        assertTrue(result.note().contains("tối thiểu 7 ngày"));
    }
}
