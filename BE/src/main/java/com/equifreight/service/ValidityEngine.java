package com.equifreight.service;

import com.equifreight.configuration.AppConstants;
import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.DocumentVersion;
import com.equifreight.entity.RegulationRule;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.RegulationRuleKind;
import com.equifreight.entity.enums.Validity;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * BR-F2-02: Automatic document validity evaluation engine.
 * Evaluates document versions against the job's planned schedule and pinned regulation rules.
 * All calendar day calculations work in the business calendar time zone (Asia/Ho_Chi_Minh).
 */
@Component
public class ValidityEngine {

    public record Result(Validity validity, String note) {}

    public Result evaluate(ChecklistItem item, DocumentVersion version, TransportJob job) {
        if (version == null) {
            return new Result(Validity.RED, "No document uploaded yet.");
        }

        RegulationRule rule = item.getRegulationRule();
        if (rule == null) {
            return new Result(Validity.GREEN, "Valid document (no date rules apply).");
        }

        RegulationRuleKind kind = rule.getRuleKind();
        if (kind == RegulationRuleKind.PRESENCE_ONLY) {
            return new Result(Validity.GREEN, "Document uploaded and ready for inspection.");
        }

        LocalDate departureDate = job != null && job.getPlannedDepartureAt() != null
                ? job.getPlannedDepartureAt().atZone(AppConstants.BUSINESS_ZONE).toLocalDate()
                : null;

        LocalDate arrivalDate = job != null && job.getPlannedArrivalAt() != null
                ? job.getPlannedArrivalAt().atZone(AppConstants.BUSINESS_ZONE).toLocalDate()
                : null;

        return switch (kind) {
            case WINDOW_BEFORE_DEPARTURE -> evaluateWindowBeforeDeparture(rule, version, departureDate);
            case VALID_THROUGH_ARRIVAL_PLUS -> evaluateValidThroughArrivalPlus(rule, version, arrivalDate);
            case BOOSTER_WINDOW -> evaluateBoosterWindow(rule, version, departureDate);
            case PRESENCE_ONLY -> new Result(Validity.GREEN, "Valid document.");
        };
    }

    private Result evaluateWindowBeforeDeparture(RegulationRule rule, DocumentVersion version, LocalDate departureDate) {
        LocalDate date = version.getSampledOn() != null ? version.getSampledOn() : version.getIssuedOn();
        if (date == null) {
            return new Result(Validity.RED, "Missing sampling or issue date.");
        }
        if (departureDate == null) {
            return new Result(Validity.AMBER, "Planned departure date is not scheduled yet.");
        }

        long daysBefore = ChronoUnit.DAYS.between(date, departureDate);
        if (daysBefore < 0) {
            return new Result(Validity.RED, "Document issued after scheduled departure.");
        }

        Short maxDays = rule.getMaxDays();
        if (maxDays != null && daysBefore > maxDays) {
            LocalDate earliestValidDate = departureDate.minusDays(maxDays);
            return new Result(Validity.RED, String.format(
                    "Expired %d days before departure (max allowed %d days). Sampling must be on or after %s.",
                    daysBefore, maxDays, earliestValidDate));
        }

        if (maxDays != null && (maxDays - daysBefore) <= 3) {
            return new Result(Validity.AMBER, String.format(
                    "Valid at departure (%d days before), but nearing expiration window (max %d days).",
                    daysBefore, maxDays));
        }

        return new Result(Validity.GREEN, String.format(
                "Issued %d days before departure (within allowed window of max %s days).",
                daysBefore, maxDays != null ? maxDays : "N/A"));
    }

    private Result evaluateValidThroughArrivalPlus(RegulationRule rule, DocumentVersion version, LocalDate arrivalDate) {
        LocalDate validUntil = version.getValidUntil();
        if (validUntil == null) {
            return new Result(Validity.RED, "Missing document expiration date (validUntil).");
        }
        if (arrivalDate == null) {
            return new Result(Validity.AMBER, "Planned arrival date is not scheduled yet.");
        }

        short bufferDays = (rule.getVersion() != null)
                ? (short) rule.getVersion().getArrivalBufferDays()
                : 2;

        LocalDate requiredDate = arrivalDate.plusDays(bufferDays);

        if (validUntil.isBefore(arrivalDate)) {
            return new Result(Validity.RED, String.format(
                    "Document expires on %s before planned arrival on %s.",
                    validUntil, arrivalDate));
        }

        if (validUntil.isBefore(requiredDate)) {
            return new Result(Validity.AMBER, String.format(
                    "Document valid at arrival (%s), but expires before mandatory buffer (%d days after arrival: %s).",
                    arrivalDate, bufferDays, requiredDate));
        }

        return new Result(Validity.GREEN, String.format(
                "Valid through %s (meets arrival date + %d buffer days).",
                validUntil, bufferDays));
    }

    private Result evaluateBoosterWindow(RegulationRule rule, DocumentVersion version, LocalDate departureDate) {
        LocalDate date = version.getIssuedOn() != null ? version.getIssuedOn() : version.getSampledOn();
        if (date == null) {
            return new Result(Validity.RED, "Missing booster vaccination date.");
        }
        if (departureDate == null) {
            return new Result(Validity.AMBER, "Planned departure date is not scheduled yet.");
        }

        long daysBefore = ChronoUnit.DAYS.between(date, departureDate);
        Short minDays = rule.getMinDays();
        Short maxDays = rule.getMaxDays();

        if (minDays != null && daysBefore < minDays) {
            return new Result(Validity.RED, String.format(
                    "Vaccination administered %d days before departure (requires minimum %d days to develop immunity).",
                    daysBefore, minDays));
        }

        if (maxDays != null && daysBefore > maxDays) {
            return new Result(Validity.RED, String.format(
                    "Vaccination administered %d days before departure (exceeds maximum allowed %d days). Booster required.",
                    daysBefore, maxDays));
        }

        return new Result(Validity.GREEN, String.format(
                "Booster vaccination valid: administered %d days before departure (allowed window: %s to %s days).",
                daysBefore, minDays != null ? minDays : 0, maxDays != null ? maxDays : "unlimited"));
    }
}
