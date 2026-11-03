package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Place;
import com.equifreight.entity.QuarantinePeriod;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.enums.QuarantineKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.repository.QuarantinePeriodRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * How a scheduled quarantine binds the journey (US-F3-22): the trip into the station brings the horses by the
 * quarantine's first day, and the trip after it collects them from its last day, in business time. A quarantine for one
 * horse holds the whole shipment, so every open period of the job at the station counts.
 *
 * <p>It is also where a quarantine's kind is read: which quarantines hold departure, and how short one may be. Both
 * are the same for every origin today; a later story resolves them per origin here, without touching the clearance
 * gate or the scheduling form.
 */
@Service
public class QuarantineRules {

    private static final DateTimeFormatter AT =
            DateTimeFormatter.ofPattern("HH:mm 'on' d MMM", Locale.ENGLISH).withZone(BusinessTime.ZONE);

    private final QuarantinePeriodRepository quarantines;

    public QuarantineRules(QuarantinePeriodRepository quarantines) {
        this.quarantines = quarantines;
    }

    /** Whether the quarantine holds the clearance gate, and so departure, until it is completed: a pre-export one. */
    public boolean holdsDeparture(QuarantinePeriod quarantine) {
        return quarantine.getKind() != QuarantineKind.POST_ARRIVAL;
    }

    /**
     * The fewest days a quarantine of this kind may last: the pinned destination catalog's {@code
     * quarantine_min_days}, for either kind for now.
     */
    public int minimumDays(QuarantineKind kind, RegulationVersion destination) {
        return destination.getQuarantineMinDays();
    }

    /** The job's quarantines at {@code place} that are not completed yet. */
    @Transactional(readOnly = true)
    public List<QuarantinePeriod> heldAt(TransportJob job, Place place) {
        if (job == null || job.getId() == null || place == null || place.getId() == null) return List.of();
        return quarantines.findByJobIdAndPlaceIdAndCompletedAtIsNull(job.getId(), place.getId());
    }

    /** Refuses a transfer into the station after a quarantine there has started. */
    public void requireArrivesBy(Trip trip, TransportJob job, Place place, Instant transferAt) {
        if (transferAt == null) return;
        LocalDate arrives = LocalDate.ofInstant(transferAt, BusinessTime.ZONE);
        for (QuarantinePeriod q : heldAt(job, place)) {
            if (arrives.isAfter(q.getStartsOn())) {
                throw new BusinessException(
                        "QUARANTINE_ARRIVES_LATE",
                        "%s brings the horses to %s at %s; their quarantine there starts on %s. Plan the transfer on or before then."
                                .formatted(
                                        trip.getCode(),
                                        place.getName(),
                                        AT.format(transferAt),
                                        BusinessTime.SHORT_DAY.format(q.getStartsOn())));
            }
        }
    }

    /** Refuses a pickup at the station before a quarantine there has ended. */
    public void requireCollectsAfter(Trip trip, TransportJob job, Place place, Instant pickupAt) {
        if (pickupAt == null) return;
        LocalDate collects = LocalDate.ofInstant(pickupAt, BusinessTime.ZONE);
        for (QuarantinePeriod q : heldAt(job, place)) {
            if (collects.isBefore(q.getEndsOn())) {
                throw new BusinessException(
                        "QUARANTINE_NOT_ENDED",
                        "%s collects the horses at %s; their quarantine at %s ends on %s. Plan the pickup on or after then."
                                .formatted(
                                        trip.getCode(),
                                        AT.format(pickupAt),
                                        place.getName(),
                                        BusinessTime.SHORT_DAY.format(q.getEndsOn())));
            }
        }
    }
}
