package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Handover;
import com.equifreight.entity.Incident;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.HandoverOutcome;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.trip.HandoverResponse;
import com.equifreight.model.trip.TripMapper;
import com.equifreight.repository.HandoverRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The customer's answer to the handover (US-F6-02, docs/handover-design.md): they accept it, or raise a discrepancy
 * with a description, which opens an incident for the logistics manager. With no answer by the time it is due, and no
 * incident still open on the job, the handover is taken as accepted.
 */
@Log4j2
@Service
public class HandoverService {

    private static final String ENTITY_TYPE = "TRANSPORT_JOB";
    private static final DateTimeFormatter DAY_TIME = DateTimeFormatter.ofPattern("d MMM HH:mm", Locale.ENGLISH);
    /** An incident not yet resolved pauses the default acceptance. */
    static final EnumSet<IncidentStatus> UNRESOLVED = EnumSet.of(IncidentStatus.OPEN, IncidentStatus.DECIDED);

    private final HandoverRepository handovers;
    private final TransportJobRepository jobs;
    private final IncidentRepository incidents;
    private final IncidentService incidentService;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public HandoverService(
            HandoverRepository handovers,
            TransportJobRepository jobs,
            IncidentRepository incidents,
            IncidentService incidentService,
            AuditService audit,
            NotificationService notifications,
            Clock clock) {
        this.handovers = handovers;
        this.jobs = jobs;
        this.incidents = incidents;
        this.incidentService = incidentService;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    /** The customer accepts the delivery: the job is done as far as they are concerned. */
    @Transactional
    public HandoverResponse accept(String jobCode, User customer) {
        Handover handover = awaitingAnswer(jobCode, customer);
        TransportJob job = handover.getJob();
        Instant now = clock.instant();
        handover.setCustomerOutcome(HandoverOutcome.CONFIRMED_SOUND);
        handover.setConfirmedBy(customer);
        handover.setConfirmedAt(now);
        handovers.save(handover);
        audit.recordDecision(
                customer,
                "HANDOVER_ACCEPTED",
                AuditText.fit("Accepted the handover of " + job.getCode()),
                ENTITY_TYPE,
                job.getId(),
                job.getCode(),
                null,
                null,
                HandoverOutcome.CONFIRMED_SOUND.name());
        tellOffice(job, "Handover accepted: " + job.getCode(), customer.displayName() + " accepted the delivery.");
        return TripMapper.toHandoverResponse(handover);
    }

    /**
     * The customer reports what went wrong, as written: the handover stays unaccepted, and the logistics manager who
     * owns the job's incidents is alerted through the incident it opens.
     */
    @Transactional
    public HandoverResponse reportDiscrepancy(String jobCode, User customer, String description) {
        String text = description == null ? "" : description.strip();
        if (text.isEmpty()) throw new BusinessException("Describe what went wrong, so the right person can act on it");
        Handover handover = awaitingAnswer(jobCode, customer);
        TransportJob job = handover.getJob();
        Incident incident = incidentService.raiseFromCustomer(job, customer, text);
        handover.setCustomerOutcome(HandoverOutcome.PROBLEM_REPORTED);
        handover.setConfirmedBy(customer);
        handover.setConfirmedAt(clock.instant());
        handover.setDiscrepancy(text);
        handover.setDiscrepancyIncident(incident);
        handovers.save(handover);
        audit.recordDecision(
                customer,
                "HANDOVER_DISCREPANCY",
                AuditText.fit("Raised a discrepancy on the handover of " + job.getCode()),
                ENTITY_TYPE,
                job.getId(),
                job.getCode(),
                text,
                null,
                HandoverOutcome.PROBLEM_REPORTED.name());
        return TripMapper.toHandoverResponse(handover);
    }

    /**
     * No answer by the time it was due (US-F6-02): the handover is taken as accepted, as both sides were told, unless
     * an incident on the job is still open; then it waits until that is resolved.
     */
    @Transactional
    public void acceptByDefault(java.util.UUID handoverId) {
        Handover handover =
                handovers.findById(handoverId).orElseThrow(() -> ResourceNotFoundException.of("Handover", handoverId));
        TransportJob job = handover.getJob();
        if (handover.getCustomerOutcome() != null || incidents.existsByJob_IdAndStatusIn(job.getId(), UNRESOLVED)) {
            return;
        }
        handover.setCustomerOutcome(HandoverOutcome.CONFIRMED_SOUND);
        handover.setAcceptedByDefault(true);
        handover.setConfirmedAt(clock.instant());
        handovers.save(handover);
        audit.recordSystem(
                "HANDOVER_ACCEPTED",
                AuditText.fit("Handover of " + job.getCode() + " taken as accepted: no answer by "
                        + DAY_TIME.format(handover.getConfirmDueAt().atZone(BusinessTime.ZONE))),
                ENTITY_TYPE,
                job.getId(),
                job.getCode(),
                null,
                HandoverOutcome.CONFIRMED_SOUND.name());
        tellOffice(
                job,
                "Handover accepted: " + job.getCode(),
                "The customer didn't answer by the due time, so the handover is taken as accepted.");
        log.info("Handover of {} taken as accepted", job.getCode());
    }

    /** The club's job, handed over and still waiting for its answer; anything else is refused with what holds it. */
    private Handover awaitingAnswer(String jobCode, User customer) {
        TransportJob job = jobs.findByCode(jobCode).orElseThrow(() -> ResourceNotFoundException.of("Trip", jobCode));
        if (customer.getClub() == null
                || !job.getRequest().getClub().getId().equals(customer.getClub().getId())) {
            throw ResourceNotFoundException.of("Trip", jobCode);
        }
        Handover handover = handovers
                .findByJob_Id(job.getId())
                .filter(h -> h.getHandedOverAt() != null)
                .orElseThrow(() -> new BusinessException(
                        jobCode + " hasn't been handed over yet: you can answer once the escort records the handover"));
        if (handover.getCustomerOutcome() != null) {
            throw new ConflictException(
                    "HANDOVER_ANSWERED",
                    "The handover of " + jobCode + " was already "
                            + (handover.getCustomerOutcome() == HandoverOutcome.CONFIRMED_SOUND
                                    ? "accepted"
                                    : "answered with a discrepancy")
                            + " on " + DAY_TIME.format(handover.getConfirmedAt().atZone(BusinessTime.ZONE)));
        }
        return handover;
    }

    /** The job's coordinator and the manager who approved it hear the answer. */
    private void tellOffice(TransportJob job, String title, String body) {
        List<User> office = new ArrayList<>();
        if (job.getApprovedBy() != null) office.add(job.getApprovedBy());
        if (job.getCoordinator() != null && !office.contains(job.getCoordinator())) office.add(job.getCoordinator());
        if (office.isEmpty()) return;
        notifications.notify(NotificationKind.HANDOVER_ACCEPTED, Audience.staff(office), Subject.job(job), title, body);
    }
}
