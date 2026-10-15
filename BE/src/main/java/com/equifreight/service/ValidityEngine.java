package com.equifreight.service;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.DocumentVersion;
import com.equifreight.entity.RegulationRule;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.RegulationRuleKind;
import com.equifreight.entity.enums.Validity;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

/**
 * BR-F2-02: Automatic document validity check.
 * Evaluates document versions against the job's planned schedule and pinned regulation rules.
 */
@Component
public class ValidityEngine {

    public record Result(Validity validity, String note) {}

    public Result evaluate(ChecklistItem item, DocumentVersion version, TransportJob job) {
        if (version == null) {
            return new Result(Validity.RED, "Chưa có tài liệu được tải lên.");
        }

        RegulationRule rule = item.getRegulationRule();
        if (rule == null) {
            return new Result(Validity.GREEN, "Tài liệu hợp lệ (không áp dụng quy tắc ngày tháng).");
        }

        RegulationRuleKind kind = rule.getRuleKind();
        if (kind == RegulationRuleKind.PRESENCE_ONLY) {
            return new Result(Validity.GREEN, "Tài liệu đã được tải lên và sẵn sàng kiểm tra nội dung.");
        }

        LocalDate departureDate = job != null && job.getPlannedDepartureAt() != null
                ? job.getPlannedDepartureAt().atZone(ZoneOffset.UTC).toLocalDate()
                : null;

        LocalDate arrivalDate = job != null && job.getPlannedArrivalAt() != null
                ? job.getPlannedArrivalAt().atZone(ZoneOffset.UTC).toLocalDate()
                : null;

        return switch (kind) {
            case WINDOW_BEFORE_DEPARTURE -> evaluateWindowBeforeDeparture(rule, version, departureDate);
            case VALID_THROUGH_ARRIVAL_PLUS -> evaluateValidThroughArrivalPlus(rule, version, arrivalDate);
            case BOOSTER_WINDOW -> evaluateBoosterWindow(rule, version, departureDate);
            case PRESENCE_ONLY -> new Result(Validity.GREEN, "Tài liệu hợp lệ.");
        };
    }

    private Result evaluateWindowBeforeDeparture(RegulationRule rule, DocumentVersion version, LocalDate departureDate) {
        LocalDate date = version.getSampledOn() != null ? version.getSampledOn() : version.getIssuedOn();
        if (date == null) {
            return new Result(Validity.RED, "Thiếu ngày lấy mẫu/ngày cấp chứng nhận.");
        }
        if (departureDate == null) {
            return new Result(Validity.AMBER, "Chưa xác định ngày khởi hành dự kiến.");
        }

        long daysBefore = ChronoUnit.DAYS.between(date, departureDate);
        if (daysBefore < 0) {
            return new Result(Validity.RED, "Ngày tài liệu cấp sau ngày khởi hành dự kiến.");
        }

        Short maxDays = rule.getMaxDays();
        if (maxDays != null && daysBefore > maxDays) {
            LocalDate earliestValidDate = departureDate.minusDays(maxDays);
            return new Result(Validity.RED, String.format(
                    "Đã quá hạn %d ngày so với ngày khởi hành (tối đa %d ngày). Cần lấy mẫu vào hoặc sau ngày %s.",
                    daysBefore, maxDays, earliestValidDate));
        }

        if (maxDays != null && (maxDays - daysBefore) <= 3) {
            return new Result(Validity.AMBER, String.format(
                    "Hợp lệ tại thời điểm khởi hành (%d ngày trước xuất phát), nhưng sắp hết hạn (tối đa %d ngày).",
                    daysBefore, maxDays));
        }

        return new Result(Validity.GREEN, String.format(
                "Được cấp %d ngày trước ngày khởi hành (trong khung cho phép tối đa %s ngày).",
                daysBefore, maxDays != null ? maxDays : "N/A"));
    }

    private Result evaluateValidThroughArrivalPlus(RegulationRule rule, DocumentVersion version, LocalDate arrivalDate) {
        LocalDate validUntil = version.getValidUntil();
        if (validUntil == null) {
            return new Result(Validity.RED, "Thiếu ngày hết hạn tài liệu (validUntil).");
        }
        if (arrivalDate == null) {
            return new Result(Validity.AMBER, "Chưa xác định ngày đến dự kiến.");
        }

        short bufferDays = (rule.getVersion() != null)
                ? (short) rule.getVersion().getArrivalBufferDays()
                : 2;

        LocalDate requiredDate = arrivalDate.plusDays(bufferDays);

        if (validUntil.isBefore(arrivalDate)) {
            return new Result(Validity.RED, String.format(
                    "Tài liệu hết hạn vào ngày %s trước ngày đến dự kiến %s.",
                    validUntil, arrivalDate));
        }

        if (validUntil.isBefore(requiredDate)) {
            return new Result(Validity.AMBER, String.format(
                    "Tài liệu còn hạn khi đến (%s), nhưng hết hạn trước thời gian đệm an toàn (%d ngày sau khi đến: %s).",
                    arrivalDate, bufferDays, requiredDate));
        }

        return new Result(Validity.GREEN, String.format(
                "Hạn sử dụng đến %s (thỏa mãn điều kiện đến nơi + %d ngày đệm an toàn).",
                validUntil, bufferDays));
    }

    private Result evaluateBoosterWindow(RegulationRule rule, DocumentVersion version, LocalDate departureDate) {
        LocalDate date = version.getIssuedOn() != null ? version.getIssuedOn() : version.getSampledOn();
        if (date == null) {
            return new Result(Validity.RED, "Thiếu ngày tiêm chủng nhắc lại.");
        }
        if (departureDate == null) {
            return new Result(Validity.AMBER, "Chưa xác định ngày khởi hành dự kiến.");
        }

        long daysBefore = ChronoUnit.DAYS.between(date, departureDate);
        Short minDays = rule.getMinDays();
        Short maxDays = rule.getMaxDays();

        if (minDays != null && daysBefore < minDays) {
            return new Result(Validity.RED, String.format(
                    "Mũi tiêm được thực hiện trước ngày khởi hành %d ngày (yêu cầu tối thiểu %d ngày để có kháng thể).",
                    daysBefore, minDays));
        }

        if (maxDays != null && daysBefore > maxDays) {
            return new Result(Validity.RED, String.format(
                    "Mũi tiêm đã quá %d ngày trước khởi hành (vượt quá thời hạn hiệu lực tối đa %d ngày). Cần tiêm nhắc lại.",
                    daysBefore, maxDays));
        }

        return new Result(Validity.GREEN, String.format(
                "Mũi tiêm hợp lệ: thực hiện trước ngày khởi hành %d ngày (trong khoảng %s - %s ngày).",
                daysBefore, minDays != null ? minDays : 0, maxDays != null ? maxDays : "vô hạn"));
    }
}
