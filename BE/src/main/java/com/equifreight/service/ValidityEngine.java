package com.equifreight.service;

import com.equifreight.configuration.AppConstants;
import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.DocumentVersion;
import com.equifreight.entity.RegulationRule;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.enums.RegulationRuleKind;
import com.equifreight.entity.enums.Validity;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;

/**
 * BR-F2-02: Automatic document validity evaluation engine.
 * Evaluates document versions against the job's planned schedule and pinned regulation rules (BR-F2-10), and
 * against today only to tell an out-of-date document (RED) from one that ages out before the trip (AMBER).
 * All calendar day calculations work in the business calendar time zone (Asia/Ho_Chi_Minh).
 */
@Service
public class ValidityEngine {

    private final Clock clock;

    public ValidityEngine(Clock clock) {
        this.clock = clock;
    }

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

        LocalDate today = LocalDate.now(clock.withZone(AppConstants.BUSINESS_ZONE));

        return switch (kind) {
            case WINDOW_BEFORE_DEPARTURE -> evaluateWindowBeforeDeparture(item, rule, version, departureDate, today);
            case VALID_THROUGH_ARRIVAL_PLUS -> evaluateValidThroughArrivalPlus(item, rule, version, arrivalDate, today);
            case BOOSTER_WINDOW -> evaluateBoosterWindow(item, rule, version, departureDate, today);
            default -> throw new IllegalStateException("Unexpected value: " + kind);
        };
    }

    private Result evaluateWindowBeforeDeparture(
            ChecklistItem item,
            RegulationRule rule,
            DocumentVersion version,
            LocalDate departureDate,
            LocalDate today) {
        boolean sampled = version.getSampledOn() != null;
        LocalDate date = sampled ? version.getSampledOn() : version.getIssuedOn();
        String verb = sampled ? "Sampled" : "Issued";
        Short maxDays = rule.getMaxDays();
        String ruleText = maxDays != null
                ? String.format("%s within %d days before departure", verb, maxDays)
                : String.format("%s before departure", verb);
        if (date == null) {
            return new Result(Validity.RED, "Missing sampling or issue date.");
        }
        if (departureDate == null) {
            return new Result(Validity.AMBER, "Planned departure date is not scheduled yet.");
        }

        long daysBefore = ChronoUnit.DAYS.between(date, departureDate);
        if (daysBefore < 0) {
            return Result.of(
                    Validity.RED,
                    ruleText,
                    String.format("%s %s, after your %s departure", verb, day(date), day(departureDate)),
                    String.format("%s on %s or earlier", verb.toLowerCase(), day(departureDate)),
                    null);
        }
        if (maxDays == null || daysBefore <= maxDays) {
            return Result.of(
                    Validity.GREEN,
                    ruleText,
                    String.format("%s %s, %d days before departure", verb, day(date), daysBefore),
                    null,
                    null);
        }

        LocalDate earliest = departureDate.minusDays(maxDays);
        String required = String.format("%s on %s or later", verb.toLowerCase(), day(earliest));
        long ageToday = ChronoUnit.DAYS.between(date, today);
        if (ageToday > maxDays) {
            return Result.of(
                    Validity.RED,
                    ruleText,
                    String.format(
                            "%s %s: %d days before your %s departure and already %d days old today",
                            verb, day(date), daysBefore, day(departureDate), ageToday),
                    required,
                    null);
        }
        return Result.of(
                Validity.AMBER,
                ruleText,
                String.format(
                        "%s %s: valid until %s, so %d days old at departure",
                        verb, day(date), day(date.plusDays(maxDays)), daysBefore),
                required,
                renewBy(item, earliest, departureDate));
    }

    private Result evaluateValidThroughArrivalPlus(
            ChecklistItem item, RegulationRule rule, DocumentVersion version, LocalDate arrivalDate, LocalDate today) {
        LocalDate validUntil = version.getValidUntil();
        if (validUntil == null) {
            return new Result(Validity.RED, "Missing document expiration date (validUntil).");
        }
        if (arrivalDate == null) {
            return new Result(Validity.AMBER, "Planned arrival date is not scheduled yet.");
        }

        short bufferDays = (rule.getVersion() != null) ? rule.getVersion().getArrivalBufferDays() : 2;
        LocalDate requiredDate = arrivalDate.plusDays(bufferDays);
        String ruleText = String.format("Valid until at least %d days after arrival", bufferDays);
        String required = String.format("valid until %s or later", day(requiredDate));

        if (!validUntil.isBefore(requiredDate)) {
            return Result.of(
                    Validity.GREEN,
                    ruleText,
                    String.format("Valid until %s, which covers arrival + %d days", day(validUntil), bufferDays),
                    null,
                    null);
        }
        if (validUntil.isBefore(today)) {
            return Result.of(Validity.RED, ruleText, String.format("Expired on %s", day(validUntil)), required, null);
        }
        return Result.of(
                Validity.AMBER,
                ruleText,
                String.format(
                        "Valid until %s, before your %s arrival + %d days",
                        day(validUntil), day(arrivalDate), bufferDays),
                required,
                renewBy(item, null, validUntil));
    }

    private Result evaluateBoosterWindow(
            ChecklistItem item,
            RegulationRule rule,
            DocumentVersion version,
            LocalDate departureDate,
            LocalDate today) {
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
        String ruleText = String.format(
                "Given %s%s days before departure",
                minDays != null ? minDays : 0, maxDays != null ? "–" + maxDays : " or more");
        LocalDate latest = minDays != null ? departureDate.minusDays(minDays) : departureDate;
        LocalDate earliest = maxDays != null ? departureDate.minusDays(maxDays) : null;
        String required = earliest != null
                ? String.format("given between %s and %s", day(earliest), day(latest))
                : String.format("given on %s or earlier", day(latest));

        if (minDays != null && daysBefore < minDays) {
            return Result.of(
                    Validity.RED,
                    ruleText,
                    String.format(
                            "Given %s, %d days before departure: too late to protect the horse in transit",
                            day(date), daysBefore),
                    required,
                    null);
        }

        if (maxDays != null && daysBefore > maxDays) {
            long ageToday = ChronoUnit.DAYS.between(date, today);
            if (ageToday > maxDays) {
                return Result.of(
                        Validity.RED,
                        ruleText,
                        String.format("Given %s: the booster lapsed on %s", day(date), day(date.plusDays(maxDays))),
                        required,
                        null);
            }
            return Result.of(
                    Validity.AMBER,
                    ruleText,
                    String.format(
                            "Given %s: the booster lapses on %s, before your %s departure",
                            day(date), day(date.plusDays(maxDays)), day(departureDate)),
                    required,
                    renewBy(item, earliest, latest));
        }

        return Result.of(
                Validity.GREEN,
                ruleText,
                String.format("Given %s, %d days before departure", day(date), daysBefore),
                null,
                null);
    }

    /**
     * The date a replacement is needed by (spec 3.4.1, AMBER): the item's deadline, unless a passing replacement
     * can't exist by then, in which case the latest date one still helps.
     */
    private static LocalDate renewBy(ChecklistItem item, LocalDate earliestPassing, LocalDate latest) {
        LocalDate due = item.getDueDate();
        if (due == null || due.isAfter(latest)) {
            return latest;
        }
        if (earliestPassing != null && due.isBefore(earliestPassing)) {
            return latest;
        }
        return due;
    }

    private static String day(LocalDate date) {
        return ClearanceText.day(date);
    }

    /**
     * The check's answer. {@code rule}, {@code found} and {@code required} name the rule, the value found on the
     * document and the value that passes (US-F2-09); {@code renewBy} is when an AMBER document's replacement is
     * needed. They are null when the check didn't get as far as a rule.
     */
    public record Result(
            Validity validity, String note, String rule, String found, String required, LocalDate renewBy) {

        public Result(Validity validity, String note) {
            this(validity, note, null, null, null, null);
        }

        static Result of(Validity validity, String rule, String found, String required, LocalDate renewBy) {
            StringBuilder note = new StringBuilder(found).append('.');
            if (required != null && validity != Validity.GREEN) {
                note.append(" Needs to be ").append(required).append('.');
            }
            if (renewBy != null) {
                note.append(" Replace it by ").append(day(renewBy)).append('.');
            }
            return new Result(validity, note.toString(), rule, found, required, renewBy);
        }
    }
}
