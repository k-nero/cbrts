package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.CrewAssignment;
import com.equifreight.entity.Incident;
import com.equifreight.entity.IncidentOption;
import com.equifreight.entity.JobCharge;
import com.equifreight.entity.RoutePlan;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
import com.equifreight.entity.TripJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.Channel;
import com.equifreight.entity.enums.IncidentKind;
import com.equifreight.entity.enums.IncidentSource;
import com.equifreight.entity.enums.IncidentStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.TripStatus;
import com.equifreight.entity.enums.UserStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.incident.AddIncidentOptionRequest;
import com.equifreight.model.incident.DecideIncidentRequest;
import com.equifreight.model.incident.DelayAlertRequest;
import com.equifreight.model.incident.IncidentOptionResponse;
import com.equifreight.model.incident.IncidentResponse;
import com.equifreight.model.incident.IncidentSummaryResponse;
import com.equifreight.model.incident.JobIncidentResponse;
import com.equifreight.model.incident.ProposeOptionRequest;
import com.equifreight.model.incident.RaiseIncidentRequest;
import com.equifreight.model.incident.ResolveIncidentRequest;
import com.equifreight.model.incident.ReturnProposalRequest;
import com.equifreight.model.review.HistoryEntryResponse;
import com.equifreight.model.trip.TripMapper;
import com.equifreight.repository.AuditLogRepository;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.JobChargeRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.TripRecordRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Incidents (Flow 5, docs/incidents-design.md). The escort reports an emergency from the cab in a few taps (US-F5-01):
 * the logistics manager who owns the job's incidents and the job's coordinator are alerted at once, and the report is
 * kept as written, with its time and author. The coordinator records the options, each with its cost and delay, and
 * proposes one for approval (US-F5-02); the logistics manager approves it, with what it does to the route, the
 * documents and the invoice, or sends it back (US-F5-03).
 */
@Service
@Log4j2
public class IncidentService {

    /** What the cab can report; HELD comes from the trip log and CUSTOMER_REPORT from the customer. */
    static final Set<IncidentKind> CAB_KINDS =
            EnumSet.of(IncidentKind.VEHICLE, IncidentKind.TRAFFIC, IncidentKind.WELFARE, IncidentKind.OTHER);

    /** What a coordinator's delay alert is about (US-F5-04). */
    static final Set<IncidentKind> DELAY_REASONS =
            EnumSet.of(IncidentKind.TRAFFIC, IncidentKind.WEATHER, IncidentKind.BORDER_CONGESTION);

    /** The most a delay alert moves an arrival, as for an option's delay: a week. */
    static final int MAX_DELAY_MINUTES = 7 * 24 * 60;

    private static final String ENTITY_TYPE = "INCIDENT";

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final IncidentRepository incidents;
    private final TransportJobRepository jobs;
    private final CrewAssignmentRepository crew;
    private final UserRepository users;
    private final JobTripService jobTrips;
    private final FileService files;
    private final AuditService audit;
    private final NotificationService notifications;
    private final RoutePlanService routePlans;
    private final ClearanceService clearance;
    private final JobChargeRepository charges;
    private final TripRecordRepository records;
    private final TripLeavingService leaving;
    private final FlightService flights;
    private final TripNotices notices;
    private final AuditLogRepository auditLogs;
    private final Clock clock;

    public IncidentService(
            IncidentRepository incidents,
            TransportJobRepository jobs,
            CrewAssignmentRepository crew,
            UserRepository users,
            JobTripService jobTrips,
            FileService files,
            AuditService audit,
            NotificationService notifications,
            RoutePlanService routePlans,
            ClearanceService clearance,
            JobChargeRepository charges,
            TripRecordRepository records,
            TripLeavingService leaving,
            FlightService flights,
            TripNotices notices,
            AuditLogRepository auditLogs,
            Clock clock) {
        this.incidents = incidents;
        this.jobs = jobs;
        this.crew = crew;
        this.users = users;
        this.jobTrips = jobTrips;
        this.files = files;
        this.audit = audit;
        this.notifications = notifications;
        this.routePlans = routePlans;
        this.clearance = clearance;
        this.charges = charges;
        this.records = records;
        this.leaving = leaving;
        this.flights = flights;
        this.notices = notices;
        this.auditLogs = auditLogs;
        this.clock = clock;
    }

    /**
     * An emergency reported from the cab of {@code jobCode}'s trip (US-F5-01). Only the trip's crew can report, once the
     * trip is released to them. A horse medical incident names the horse, and is raised on that horse's job; any other
     * kind on the job the cab is open on. Resending the same {@code clientRef} returns the incident already opened.
     */
    @Transactional
    public IncidentResponse raiseFromCab(String jobCode, User escort, RaiseIncidentRequest request) {
        var existing = incidents.findByClientRef(request.clientRef());
        if (existing.isPresent()) return toResponse(existing.get());

        TransportJob job = jobs.findByCode(jobCode).orElseThrow(() -> ResourceNotFoundException.of("Trip", jobCode));
        // The part of the job this escort crews, once released to them: on a job split by an earlier incident, each
        // trip's crew reports on their own part (US-F5-06).
        Trip trip = jobTrips.partsOf(job).reversed().stream()
                .filter(p -> p.released()
                        && crew.existsByTrip_IdAndUser_Id(p.getTrip().getId(), escort.getId()))
                .map(TripJob::getTrip)
                .findFirst()
                .orElseThrow(() -> ResourceNotFoundException.of("Trip", jobCode));
        if (!CAB_KINDS.contains(request.kind())) {
            throw new BusinessException("The cab reports a vehicle breakdown, a traffic jam, a horse medical incident"
                    + " or another emergency");
        }

        Incident incident = new Incident();
        if (request.horseId() != null) {
            TripHorse rider = jobTrips.horsesOn(trip).stream()
                    .filter(th -> th.getHorse().getId().equals(request.horseId()))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("That horse isn't on this trip"));
            incident.setHorse(rider.getHorse());
            job = rider.getJob();
        } else if (request.kind() == IncidentKind.WELFARE) {
            throw new BusinessException("Name the horse the medical incident concerns");
        }

        Instant now = clock.instant();
        incident.setJob(job);
        incident.setKind(request.kind());
        incident.setSource(IncidentSource.CAB);
        incident.setStatus(IncidentStatus.OPEN);
        incident.setSummary(request.description().strip());
        incident.setLocation(request.location().strip());
        incident.setReportedBy(escort);
        incident.setClientRef(request.clientRef());
        incident.setOwner(ownerOf(job));
        incident.setOpenedAt(now);
        for (UUID fileId : request.photoFileIds()) incident.getFiles().add(files.requireAttachable(fileId, escort));
        Incident saved = incidents.save(incident);

        Map<String, Object> after = new LinkedHashMap<>();
        after.put("kind", saved.getKind().name());
        after.put("location", saved.getLocation());
        after.put("horseId", saved.getHorse() == null ? null : saved.getHorse().getId());
        audit.recordFromDevice(
                escort,
                Channel.CAB_TABLET,
                request.occurredAt() == null ? now : request.occurredAt(),
                "RAISE_INCIDENT",
                AuditText.fit(saved.getKind().label() + " reported on " + job.getCode() + " at " + saved.getLocation()),
                "INCIDENT",
                saved.getId(),
                job.getCode(),
                after);
        alert(saved, now);
        log.info("{} reported on {} by {}", saved.getKind(), job.getCode(), escort.getEmail());
        return toResponse(saved);
    }

    /**
     * A discrepancy the customer raised at the handover (US-F6-02): an incident of kind CUSTOMER_REPORT on the job,
     * owned like any other, with what they wrote as its summary. The owner and the coordinator are alerted at once.
     */
    @Transactional
    public Incident raiseFromCustomer(TransportJob job, User customer, String description) {
        Instant now = clock.instant();
        Incident incident = new Incident();
        incident.setJob(job);
        incident.setKind(IncidentKind.CUSTOMER_REPORT);
        incident.setSource(IncidentSource.CUSTOMER);
        incident.setStatus(IncidentStatus.OPEN);
        incident.setSummary(description);
        incident.setReportedBy(customer);
        incident.setOwner(ownerOf(job));
        incident.setOpenedAt(now);
        Incident saved = incidents.save(incident);
        audit.recordDecision(
                customer,
                "RAISE_INCIDENT",
                AuditText.fit("Discrepancy reported on the handover of " + job.getCode()),
                ENTITY_TYPE,
                saved.getId(),
                job.getCode(),
                description,
                null,
                IncidentStatus.OPEN.name());
        alert(saved, now);
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<IncidentSummaryResponse> list(Collection<IncidentStatus> statuses, Pageable pageable) {
        Collection<IncidentStatus> shown =
                statuses == null || statuses.isEmpty() ? EnumSet.allOf(IncidentStatus.class) : statuses;
        return incidents.findByStatusIn(shown, pageable).map(IncidentService::toSummary);
    }

    @Transactional(readOnly = true)
    public IncidentResponse get(UUID id) {
        return toResponse(incident(id));
    }

    /**
     * Records an option for handling the incident (US-F5-02), with its estimated extra cost, the delay it adds and
     * whether it changes the route. Options are added while the incident is open and no proposal waits for a decision.
     */
    @Transactional
    public IncidentResponse addOption(UUID id, AddIncidentOptionRequest request, User user) {
        Incident incident = incident(id);
        requireOpenWithoutProposal(incident, "add an option");
        IncidentOption option = new IncidentOption();
        option.setIncident(incident);
        option.setPosition((short) (incident.getOptions().stream()
                        .mapToInt(IncidentOption::getPosition)
                        .max()
                        .orElse(0)
                + 1));
        option.setTitle(request.title().strip());
        option.setDescription(
                request.description() == null || request.description().isBlank()
                        ? null
                        : request.description().strip());
        option.setExtraCost(request.extraCost());
        option.setDelayMinutes(request.delayMinutes());
        option.setChangesRoute(request.changesRoute());
        option.setCreatedBy(user);
        // An option may take the job, or some of its horses, off the moving trip (US-F5-06).
        leaving.prepare(incident.getJob(), option, request);
        incident.getOptions().add(option);
        Incident saved = incidents.saveAndFlush(incident);
        audit.recordDecision(
                user,
                "ADD_INCIDENT_OPTION",
                AuditText.fit("Option \"" + option.getTitle() + "\" recorded for the incident on "
                        + incident.getJob().getCode() + ": " + costLine(option, currencyOf(incident))),
                "INCIDENT",
                incident.getId(),
                incident.getJob().getCode(),
                null,
                null,
                option.getTitle());
        return toResponse(saved);
    }

    /** Takes an option off the list, while the incident is open and nothing has been proposed. */
    @Transactional
    public IncidentResponse removeOption(UUID id, UUID optionId, User user) {
        Incident incident = incident(id);
        requireOpenWithoutProposal(incident, "remove an option");
        IncidentOption option = optionOf(incident, optionId);
        incident.getOptions().remove(option);
        Incident saved = incidents.saveAndFlush(incident);
        audit.recordDecision(
                user,
                "REMOVE_INCIDENT_OPTION",
                AuditText.fit("Option \"" + option.getTitle() + "\" removed from the incident on "
                        + incident.getJob().getCode()),
                "INCIDENT",
                incident.getId(),
                incident.getJob().getCode(),
                null,
                option.getTitle(),
                null);
        return toResponse(saved);
    }

    /**
     * Proposes one option for the logistics manager's approval (US-F5-02). The owner is told a decision waits for
     * them; until they decide or send it back, the options stay as they are.
     */
    @Transactional
    public IncidentResponse propose(UUID id, ProposeOptionRequest request, User user) {
        Incident incident = incident(id);
        requireOpenWithoutProposal(incident, "propose an option");
        IncidentOption option = optionOf(incident, request.optionId());
        incident.setProposedOption(option);
        incident.setProposedBy(user);
        incident.setProposedAt(clock.instant());
        incident.setProposalNote(
                request.note() == null || request.note().isBlank()
                        ? null
                        : request.note().strip());
        Incident saved = incidents.save(incident);
        String code = incident.getJob().getCode();
        audit.recordDecision(
                user,
                "PROPOSE_INCIDENT_OPTION",
                AuditText.fit("Proposed \"" + option.getTitle() + "\" for the incident on " + code),
                "INCIDENT",
                incident.getId(),
                code,
                incident.getProposalNote(),
                null,
                option.getTitle());
        notifications.notify(
                NotificationKind.INCIDENT_PROPOSAL,
                Audience.staff(incident.getOwner()),
                Subject.incident(incident),
                "Decision needed: " + incident.getKind().label() + " on " + code,
                nameOf(user) + " proposes \"" + option.getTitle() + "\": "
                        + costLine(option, currencyOf(incident)) + "."
                        + (incident.getProposalNote() == null ? "" : " " + incident.getProposalNote()));
        return toResponse(saved);
    }

    /**
     * The logistics manager approves the proposed option (US-F5-03). An option that changes the route or adds a delay
     * gives the trip a new confirmed route version, with the stops not yet reached moved by the delay, and re-runs the
     * document check for the new dates; an extra cost the customer pays is attached to the job for the final invoice.
     * The customer gets the manager's message as written; the coordinator, whoever proposed it and the crew are told.
     */
    @Transactional
    public IncidentResponse decide(UUID id, DecideIncidentRequest request, User manager) {
        Incident incident = incident(id);
        IncidentOption option = requireProposal(incident);
        if (!option.getId().equals(request.optionId())) {
            throw new BusinessException("Approve the proposed option, \"" + option.getTitle()
                    + "\", or send it back so another can be proposed");
        }
        TransportJob job = incident.getJob();
        Instant now = clock.instant();
        incident.setStatus(IncidentStatus.DECIDED);
        incident.setDecidedOption(option);
        incident.setDecidedBy(manager);
        incident.setDecidedAt(now);
        incident.setDecisionNote(blankToNull(request.note()));
        incident.setCustomerMessage(request.customerMessage().strip());
        incident.setChargeCustomer(request.chargeCustomer());

        String reason = AuditText.fit("Incident on " + job.getCode() + ": " + option.getTitle());
        Trip trip = leaving.movingTrip(job);
        Map<UUID, Instant> arrivals = new HashMap<>();
        jobTrips.jobsOn(trip).forEach(j -> arrivals.put(j.getId(), j.getPlannedArrivalAt()));
        // The option's horses leave the moving trip: to a new trip of their own, or into care (US-F5-06).
        TripLeavingService.Departure departure = null;
        if (option.getLeavingKind() != null) {
            departure = leaving.leave(trip, job, option, manager, now);
            incident.setNewTrip(departure.newTrip());
        }
        Set<UUID> leavingJobs = departure != null && departure.jobLeftTrip() ? Set.of(job.getId()) : Set.of();
        if (option.isChangesRoute() || option.getDelayMinutes() > 0 || !leavingJobs.isEmpty()) {
            Retimed retimed = retime(trip, option.getDelayMinutes(), reason, manager, leavingJobs, arrivals);
            incident.setRoutePlan(retimed.plan());
            for (TransportJob onTrip : retimed.moved()) {
                if (onTrip.getId().equals(job.getId()) || retimed.plan() == null) continue;
                // Another customer hears only what changes for them; a missed window is an incident of its own.
                notices.arrivalMoved(onTrip, retimed.plan());
                if (pastWindow(onTrip)) {
                    lateArrival(onTrip, "The decision on " + job.getCode() + "'s incident", manager, now);
                }
            }
        }
        if (request.chargeCustomer() && option.getExtraCost().signum() > 0) {
            JobCharge charge = new JobCharge();
            charge.setJob(job);
            charge.setIncident(incident);
            charge.setDescription(AuditText.fit(incident.getKind().label() + ": " + option.getTitle()));
            charge.setAmount(option.getExtraCost());
            charge.setCreatedBy(manager);
            charges.save(charge);
        }
        Incident saved = incidents.save(incident);

        String costs = costLine(option, currencyOf(incident));
        audit.recordDecision(
                manager,
                "DECIDE_INCIDENT",
                AuditText.fit("Approved \"" + option.getTitle() + "\" for the incident on " + job.getCode() + ": "
                        + costs + (request.chargeCustomer() ? ", charged to the customer" : ", not charged")),
                "INCIDENT",
                incident.getId(),
                job.getCode(),
                incident.getDecisionNote(),
                IncidentStatus.OPEN.name(),
                IncidentStatus.DECIDED.name());

        notifications.notify(
                NotificationKind.INCIDENT_UPDATE,
                Audience.club(job.getRequest().getClub().getId()),
                Subject.incident(incident),
                "Update on " + job.getCode(),
                incident.getCustomerMessage(),
                "INCIDENT_UPDATE:" + incident.getId());
        String decided = nameOf(manager) + " approved \"" + option.getTitle() + "\": " + costs + "."
                + (saved.getRoutePlan() == null
                        ? ""
                        : " Route version " + saved.getRoutePlan().getVersionNo() + " is confirmed.");
        List<User> office = new ArrayList<>();
        if (incident.getProposedBy() != null) office.add(incident.getProposedBy());
        if (job.getCoordinator() != null && !office.contains(job.getCoordinator())) office.add(job.getCoordinator());
        office.remove(manager);
        if (!office.isEmpty()) {
            notifications.notify(
                    NotificationKind.INCIDENT_DECIDED,
                    Audience.staff(office),
                    Subject.incident(incident),
                    "Approved: " + option.getTitle(),
                    decided);
        }
        List<CrewAssignment> crewRows = new ArrayList<>(crew.findByTrip_Id(trip.getId()));
        if (incident.getNewTrip() != null)
            crewRows.addAll(crew.findByTrip_Id(incident.getNewTrip().getId()));
        List<User> crewOnTrip =
                crewRows.stream().map(CrewAssignment::getUser).distinct().toList();
        if (!crewOnTrip.isEmpty()) {
            notifications.notify(
                    NotificationKind.INCIDENT_DECIDED,
                    Audience.escorts(crewOnTrip),
                    Subject.incident(incident),
                    "Decision: " + option.getTitle(),
                    nameOf(manager) + " decided: " + option.getTitle() + "."
                            + (saved.getRoutePlan() == null ? "" : " The route times changed; check the next stops."));
        }
        if (departure != null && departure.newTrip() != null && job.getTransportSpecialist() != null) {
            // The horses' own documents are checked again when their new trip is planned; the shipment's permits
            // are the specialist's to confirm (US-F5-06).
            notifications.notify(
                    NotificationKind.INCIDENT_DECIDED,
                    Audience.staff(job.getTransportSpecialist()),
                    Subject.documents(job),
                    "Check the permits for " + job.getCode() + " on trip "
                            + departure.newTrip().getCode(),
                    String.join(", ", departure.horses()) + " left trip " + trip.getCode()
                            + " and will travel on " + departure.newTrip().getCode()
                            + ". Confirm the shipment's permits and declarations still cover them; their own documents"
                            + " are checked again for the new dates when that trip is planned.");
        }
        return toResponse(saved);
    }

    /** The logistics manager sends the proposal back, saying why; the options unlock for another proposal. */
    @Transactional
    public IncidentResponse returnProposal(UUID id, ReturnProposalRequest request, User manager) {
        Incident incident = incident(id);
        IncidentOption option = requireProposal(incident);
        User proposer = incident.getProposedBy();
        incident.setProposedOption(null);
        incident.setProposedBy(null);
        incident.setProposedAt(null);
        incident.setProposalNote(null);
        Incident saved = incidents.save(incident);
        String code = incident.getJob().getCode();
        audit.recordDecision(
                manager,
                "RETURN_INCIDENT_PROPOSAL",
                AuditText.fit("Sent back \"" + option.getTitle() + "\" for the incident on " + code),
                "INCIDENT",
                incident.getId(),
                code,
                request.reason().strip(),
                option.getTitle(),
                null);
        if (proposer != null && !proposer.getId().equals(manager.getId())) {
            notifications.notify(
                    NotificationKind.INCIDENT_RETURNED,
                    Audience.staff(proposer),
                    Subject.incident(incident),
                    "Sent back: " + option.getTitle(),
                    nameOf(manager) + ": " + request.reason().strip());
        }
        return toResponse(saved);
    }

    /**
     * A delay alert on a job that is on the road (US-F5-04): traffic, bad weather or border congestion, with the job's
     * new arrival. It opens an incident of that kind, owned like any other, and moves every stop the trip hasn't
     * reached by the delay in a new confirmed route version. The crew and every customer on the trip hear the reason
     * and their own new time; another job pushed past its window gets an incident of its own.
     */
    @Transactional
    public IncidentResponse sendDelayAlert(UUID jobId, DelayAlertRequest request, User by) {
        TransportJob job = jobs.findById(jobId).orElseThrow(() -> ResourceNotFoundException.of("Job", jobId));
        if (!DELAY_REASONS.contains(request.reason())) {
            throw new BusinessException("A delay alert is for traffic, bad weather or border congestion");
        }
        Trip trip = jobTrips.activePartsOf(job).stream()
                .filter(p -> p.departed() && p.getStatus() != TripStatus.DELIVERED)
                .map(TripJob::getTrip)
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        job.getCode() + " isn't on the road: before departure, its times move on the Route tab"));
        Instant planned = job.getPlannedArrivalAt();
        if (planned == null) {
            throw new BusinessException(job.getCode() + " has no planned arrival to move: confirm its route first");
        }
        Instant eta = request.newEta().toInstant();
        long seconds = Duration.between(planned, eta).toSeconds();
        if (seconds <= 0) {
            throw new BusinessException(
                    "The new arrival must be after the planned one, " + at(planned) + ". It was " + at(eta) + ".");
        }
        int delay = (int) Math.min(Integer.MAX_VALUE, (seconds + 59) / 60);
        if (delay > MAX_DELAY_MINUTES) {
            throw new BusinessException("A delay alert moves the arrival by up to 7 days; " + at(eta) + " is "
                    + duration(delay) + " after " + at(planned) + ".");
        }

        Instant now = clock.instant();
        String note = blankToNull(request.note());
        String label = request.reason().label();
        Map<UUID, Instant> arrivals = new HashMap<>();
        jobTrips.jobsOn(trip).forEach(j -> arrivals.put(j.getId(), j.getPlannedArrivalAt()));

        Incident incident = new Incident();
        incident.setJob(job);
        incident.setKind(request.reason());
        incident.setSource(IncidentSource.STAFF);
        incident.setStatus(IncidentStatus.OPEN);
        incident.setSummary(
                note == null ? AuditText.fit(label + " delays " + job.getCode() + " by " + duration(delay)) : note);
        incident.setReportedBy(by);
        incident.setOwner(ownerOf(job));
        incident.setOpenedAt(now);
        Incident saved = incidents.save(incident);

        Retimed retimed = retime(
                trip, delay, AuditText.fit("Delay alert on " + job.getCode() + ": " + label), by, Set.of(), arrivals);
        saved.setRoutePlan(retimed.plan());
        saved.setEtaAt(job.getPlannedArrivalAt());
        audit.recordDecision(
                by,
                "DELAY_ALERT",
                AuditText.fit(label + " delay alert on " + job.getCode() + ": arrival now " + at(saved.getEtaAt())
                        + ", " + duration(delay) + " later"),
                ENTITY_TYPE,
                saved.getId(),
                job.getCode(),
                note,
                null,
                IncidentStatus.OPEN.name());

        // Every customer on the trip hears why and their own new time; only this job's customer reads the note.
        List<TransportJob> told = new ArrayList<>(retimed.moved());
        if (told.stream().noneMatch(j -> j.getId().equals(job.getId()))) told.add(job);
        for (TransportJob onTrip : told) {
            boolean own = onTrip.getId().equals(job.getId());
            notices.delayAlert(onTrip, request.reason(), own ? note : null, delay, saved.getId());
            if (!own && pastWindow(onTrip)) lateArrival(onTrip, "The delay alert on " + job.getCode(), by, now);
        }
        List<User> crewOnTrip = crew.findByTrip_Id(trip.getId()).stream()
                .map(CrewAssignment::getUser)
                .distinct()
                .toList();
        if (!crewOnTrip.isEmpty()) {
            notifications.notify(
                    NotificationKind.DELAY_ALERT,
                    Audience.escorts(crewOnTrip),
                    Subject.incident(saved),
                    "Delay: " + label,
                    (note == null ? "" : note + (note.matches(".*[.!?]$") ? " " : ". "))
                            + "The stops ahead on trip " + trip.getCode() + " move by " + duration(delay) + "; "
                            + job.getCode() + " now arrives " + at(saved.getEtaAt()) + ".");
        }
        List<User> office = new ArrayList<>(List.of(saved.getOwner()));
        if (job.getCoordinator() != null && !office.contains(job.getCoordinator())) office.add(job.getCoordinator());
        office.removeIf(u -> u.getId().equals(by.getId()));
        if (!office.isEmpty()) {
            notifications.notify(
                    NotificationKind.DELAY_ALERT,
                    Audience.staff(office),
                    Subject.incident(saved),
                    label + ": " + job.getCode(),
                    nameOf(by) + " sent a delay alert: " + job.getCode() + " now arrives " + at(saved.getEtaAt()) + ", "
                            + duration(delay) + " later.");
        }
        return toResponse(incidents.save(saved));
    }

    /**
     * The logistics manager closes an incident with how it ended and a closing note (US-F5-05), both required. An open
     * incident can be closed without a decision (the jam cleared), but not while a proposal waits for one. Whoever
     * worked on it hears it is closed, and its timeline stays on the job.
     */
    @Transactional
    public IncidentResponse resolve(UUID id, ResolveIncidentRequest request, User manager) {
        Incident incident = incident(id);
        if (incident.getStatus() == IncidentStatus.RESOLVED) {
            throw new BusinessException("The incident was already closed on " + at(incident.getResolvedAt()));
        }
        if (incident.getStatus() == IncidentStatus.OPEN && incident.getProposedOption() != null) {
            throw new BusinessException("\"" + incident.getProposedOption().getTitle()
                    + "\" waits for a decision: approve it or send it back before closing the incident");
        }
        IncidentStatus before = incident.getStatus();
        Instant now = clock.instant();
        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setResolvedAt(now);
        incident.setResolvedBy(manager);
        incident.setResolution(request.resolution().strip());
        incident.setClosingNote(request.closingNote().strip());
        if (incident.isStopsClock()
                && incident.getClockStoppedFrom() != null
                && incident.getClockStoppedUntil() == null) {
            incident.setClockStoppedUntil(now);
        }
        Incident saved = incidents.save(incident);
        String code = incident.getJob().getCode();
        audit.recordDecision(
                manager,
                "RESOLVE_INCIDENT",
                AuditText.fit("Closed the incident on " + code + ": " + saved.getResolution()),
                ENTITY_TYPE,
                saved.getId(),
                code,
                saved.getClosingNote(),
                before.name(),
                IncidentStatus.RESOLVED.name());

        String title = "Closed: " + saved.getKind().label() + " on " + code;
        List<User> office = new ArrayList<>();
        for (User u : new User[] {saved.getJob().getCoordinator(), saved.getProposedBy(), saved.getOwner()}) {
            if (u != null && !u.getId().equals(manager.getId()) && !office.contains(u)) office.add(u);
        }
        User reporter = saved.getReportedBy();
        boolean fromCab = saved.getSource() == IncidentSource.CAB && reporter != null;
        if (!fromCab && reporter != null && !reporter.getId().equals(manager.getId()) && !office.contains(reporter)) {
            office.add(reporter);
        }
        if (!office.isEmpty()) {
            notifications.notify(
                    NotificationKind.INCIDENT_RESOLVED,
                    Audience.staff(office),
                    Subject.incident(saved),
                    title,
                    nameOf(manager) + " closed it: " + saved.getResolution());
        }
        if (fromCab) {
            notifications.notify(
                    NotificationKind.INCIDENT_RESOLVED,
                    Audience.escorts(List.of(reporter)),
                    Subject.incident(saved),
                    title,
                    nameOf(manager) + " closed the incident you reported: " + saved.getResolution());
        }
        return toResponse(saved);
    }

    /** A job's incidents, oldest first, each with its timeline: the job keeps the record of its trip (US-F5-05). */
    @Transactional(readOnly = true)
    public List<JobIncidentResponse> ofJob(UUID jobId) {
        if (!jobs.existsById(jobId)) throw ResourceNotFoundException.of("Job", jobId);
        List<Incident> list = incidents.findByJob_IdOrderByOpenedAtAsc(jobId);
        Map<UUID, List<HistoryEntryResponse>> timelines =
                timelines(list.stream().map(Incident::getId).toList());
        return list.stream()
                .map(i -> JobIncidentResponse.builder()
                        .id(i.getId())
                        .kind(i.getKind())
                        .kindLabel(i.getKind().label())
                        .status(i.getStatus())
                        .summary(i.getSummary())
                        .openedAt(i.getOpenedAt())
                        .ownerName(nameOf(i.getOwner()))
                        .etaAt(i.getEtaAt())
                        .resolution(i.getResolution())
                        .closingNote(i.getClosingNote())
                        .resolvedAt(i.getResolvedAt())
                        .resolvedByName(nameOf(i.getResolvedBy()))
                        .timeline(timelines.getOrDefault(i.getId(), List.of()))
                        .build())
                .toList();
    }

    /** Each incident's audit rows, oldest first, in one query. */
    private Map<UUID, List<HistoryEntryResponse>> timelines(List<UUID> ids) {
        Map<UUID, List<HistoryEntryResponse>> byIncident = new HashMap<>();
        if (ids.isEmpty()) return byIncident;
        auditLogs
                .findByEntityTypeAndEntityIdInOrderByOccurredAtAsc(ENTITY_TYPE, ids)
                .forEach(a -> byIncident
                        .computeIfAbsent(a.getEntityId(), k -> new ArrayList<>())
                        .add(HistoryEntryResponse.builder()
                                .occurredAt(a.getOccurredAt())
                                .summary(a.getSummary())
                                .actorLabel(a.getActorLabel())
                                .build()));
        return byIncident;
    }

    /**
     * Another job on the trip now arrives after its window closes because of {@code cause}'s decision (US-F5-06): it
     * gets an incident of its own, so its customer is told and the manager decides for them too.
     */
    private Incident lateArrival(TransportJob other, String cause, User by, Instant now) {
        Incident late = new Incident();
        late.setJob(other);
        late.setKind(IncidentKind.LATE_ARRIVAL);
        late.setSource(IncidentSource.STAFF);
        late.setStatus(IncidentStatus.OPEN);
        late.setSummary(AuditText.fit(cause + " moves " + other.getCode() + "'s arrival to "
                + at(other.getPlannedArrivalAt()) + ", after its window closes at " + at(other.getWindowEnd())));
        late.setReportedBy(by);
        late.setOwner(ownerOf(other));
        late.setOpenedAt(now);
        Incident saved = incidents.save(late);
        audit.recordDecision(
                by,
                "RAISE_INCIDENT",
                AuditText.fit(IncidentKind.LATE_ARRIVAL.label() + " opened on " + other.getCode()),
                "INCIDENT",
                saved.getId(),
                other.getCode(),
                null,
                null,
                IncidentStatus.OPEN.name());
        alert(saved, now);
        return saved;
    }

    private static boolean pastWindow(TransportJob job) {
        return job.getWindowEnd() != null
                && job.getPlannedArrivalAt() != null
                && job.getPlannedArrivalAt().isAfter(job.getWindowEnd());
    }

    /** What moving a trip's stops ahead did: the new route version (null without one), and the jobs whose arrival moved. */
    private record Retimed(RoutePlan plan, List<TransportJob> moved) {}

    /**
     * Moves every stop {@code trip} hasn't reached by {@code delayMinutes} in a new confirmed route version, taking off
     * the stops of {@code leavingJobs} (US-F5-06), and lets the flight's consignments follow. Each job whose planned
     * arrival moved from {@code arrivalsBefore} has its documents checked again for the new dates (US-F2-10); its
     * transport specialist hears which no longer hold.
     */
    private Retimed retime(
            Trip trip,
            int delayMinutes,
            String reason,
            User by,
            Set<UUID> leavingJobs,
            Map<UUID, Instant> arrivalsBefore) {
        Set<UUID> reached = new HashSet<>();
        records.findByTrip_IdOrderByOccurredAtAsc(trip.getId()).stream()
                .filter(r -> r.getRouteStop() != null)
                .forEach(r -> reached.add(r.getRouteStop().getId()));
        RoutePlan plan = routePlans
                .reviseForIncident(trip, delayMinutes, reached, reason, by, leavingJobs)
                .orElse(null);
        if (plan != null) flights.allocate(trip, plan);
        List<TransportJob> moved = new ArrayList<>();
        for (TransportJob onTrip : jobTrips.jobsOn(trip)) {
            if (Objects.equals(arrivalsBefore.get(onTrip.getId()), onTrip.getPlannedArrivalAt())) continue;
            moved.add(onTrip);
            List<String> red = clearance.recheckAfterReplan(onTrip.getId());
            if (red.isEmpty() || onTrip.getTransportSpecialist() == null) continue;
            notifications.notify(
                    NotificationKind.INCIDENT_DECIDED,
                    Audience.staff(onTrip.getTransportSpecialist()),
                    Subject.documents(onTrip),
                    "Documents to check for " + onTrip.getCode(),
                    "The new arrival after the incident makes these no longer valid: " + String.join(", ", red) + ".");
        }
        return new Retimed(plan, moved);
    }

    private static String at(Instant instant) {
        return instant.atZone(BusinessTime.ZONE)
                .format(java.time.format.DateTimeFormatter.ofPattern("d MMM HH:mm", java.util.Locale.ENGLISH));
    }

    private static IncidentOption requireProposal(Incident incident) {
        if (incident.getStatus() != IncidentStatus.OPEN) {
            throw new BusinessException(
                    "The incident is already " + incident.getStatus().name().toLowerCase(Locale.ROOT));
        }
        if (incident.getProposedOption() == null) {
            throw new BusinessException("Nothing has been proposed yet");
        }
        return incident.getProposedOption();
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.strip();
    }

    private static void requireOpenWithoutProposal(Incident incident, String action) {
        if (incident.getStatus() != IncidentStatus.OPEN) {
            throw new BusinessException("The incident is "
                    + incident.getStatus().name().toLowerCase(Locale.ROOT) + ": you can't " + action + " any more");
        }
        if (incident.getProposedOption() != null) {
            throw new BusinessException("\"" + incident.getProposedOption().getTitle()
                    + "\" waits for the logistics manager's decision: you can " + action
                    + " once they decide or send it back");
        }
    }

    private static IncidentOption optionOf(Incident incident, UUID optionId) {
        return incident.getOptions().stream()
                .filter(o -> o.getId().equals(optionId))
                .findFirst()
                .orElseThrow(() -> ResourceNotFoundException.of("Incident option", optionId));
    }

    /** The job's quotation currency, in which every cost on the incident is counted. */
    static String currencyOf(Incident incident) {
        var quotation = incident.getJob().getQuotation();
        return quotation == null || quotation.getCurrency() == null ? "USD" : quotation.getCurrency();
    }

    /** "+ USD 1,200.00, + 3 h 30 min, new route": what an option costs, in words. */
    static String costLine(IncidentOption option, String currency) {
        List<String> parts = new ArrayList<>();
        parts.add(
                option.getExtraCost().signum() == 0
                        ? "no extra cost"
                        : "+ " + currency + " " + String.format(Locale.ENGLISH, "%,.2f", option.getExtraCost()));
        parts.add(option.getDelayMinutes() == 0 ? "no delay" : "+ " + duration(option.getDelayMinutes()));
        if (option.isChangesRoute()) parts.add("new route");
        return String.join(", ", parts);
    }

    /** "3 h 30 min", "45 min". */
    static String duration(int minutes) {
        int h = minutes / 60;
        int m = minutes % 60;
        return h == 0 ? m + " min" : m == 0 ? h + " h" : h + " h " + m + " min";
    }

    Incident incident(UUID id) {
        return incidents.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Incident", id));
    }

    /** The logistics manager who approved the job owns its incidents; without one, the first active manager. */
    private User ownerOf(TransportJob job) {
        User approver = job.getApprovedBy();
        if (approver != null && approver.getStatus() == UserStatus.ACTIVE) return approver;
        return users.findByRoleAndStatus(RoleName.LOGISTICS_MANAGER, UserStatus.ACTIVE).stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException("No active logistics manager to own the incident"));
    }

    /** The owner and the job's coordinator hear at once; a job without a coordinator alerts every coordinator. */
    private void alert(Incident incident, Instant at) {
        TransportJob job = incident.getJob();
        String title = incident.getKind().label() + ": " + job.getCode();
        String body = incident.getSource() == IncidentSource.CAB
                ? incident.getSummary() + " · " + incident.getLocation() + ". Reported by "
                        + nameOf(incident.getReportedBy()) + " from the cab at "
                        + at.atZone(BusinessTime.ZONE).format(TIME) + "."
                : incident.getSummary() + ".";
        List<User> named = new ArrayList<>(List.of(incident.getOwner()));
        User coordinator = job.getCoordinator();
        if (coordinator != null
                && !coordinator.getId().equals(incident.getOwner().getId())) named.add(coordinator);
        notifications.notify(
                NotificationKind.INCIDENT_RAISED, Audience.staff(named), Subject.incident(incident), title, body);
        if (coordinator == null) {
            notifications.notify(
                    NotificationKind.INCIDENT_RAISED,
                    Audience.role(RoleName.FLEET_COORDINATOR),
                    Subject.incident(incident),
                    title,
                    body);
        }
    }

    private static IncidentSummaryResponse toSummary(Incident i) {
        return new IncidentSummaryResponse(
                i.getId(),
                i.getJob().getCode(),
                i.getKind(),
                i.getKind().label(),
                i.getStatus(),
                i.getSource(),
                i.getSummary(),
                i.getLocation(),
                i.getHorse() == null ? null : i.getHorse().getName(),
                i.getOpenedAt(),
                nameOf(i.getOwner()));
    }

    IncidentResponse toResponse(Incident i) {
        TransportJob job = i.getJob();
        var request = job.getRequest();
        return new IncidentResponse(
                i.getId(),
                job.getId(),
                job.getCode(),
                jobTrips.findTripOf(job.getId()).map(Trip::getCode).orElse(null),
                job.getTripStatus(),
                request.getOriginPlace() == null
                        ? null
                        : request.getOriginPlace().getName(),
                request.getDestinationPlace() == null
                        ? null
                        : request.getDestinationPlace().getName(),
                i.getKind(),
                i.getKind().label(),
                i.getStatus(),
                i.getSource(),
                i.getSummary(),
                i.getLocation(),
                i.getHorse() == null ? null : i.getHorse().getName(),
                i.getOpenedAt(),
                nameOf(i.getReportedBy()),
                nameOf(i.getOwner()),
                nameOf(job.getCoordinator()),
                i.getFiles().stream().map(TripMapper::toPhotoResponse).toList(),
                currencyOf(i),
                i.getOptions().stream()
                        .map(o -> new IncidentOptionResponse(
                                o.getId(),
                                o.getPosition(),
                                o.getTitle(),
                                o.getDescription(),
                                o.getExtraCost(),
                                o.getDelayMinutes(),
                                o.isChangesRoute(),
                                nameOf(o.getCreatedBy()),
                                o.getCreatedAt(),
                                o.getLeavingKind(),
                                o.getLeavingKind() == null
                                        ? null
                                        : o.getLeavingKind().label(),
                                o.getLeavingPlace(),
                                o.getVehicle() == null ? null : o.getVehicle().getCode(),
                                o.isCustomerPays(),
                                o.getHorses().stream()
                                        .map(com.equifreight.entity.Horse::getName)
                                        .sorted()
                                        .toList()))
                        .toList(),
                i.getProposedOption() == null ? null : i.getProposedOption().getId(),
                nameOf(i.getProposedBy()),
                i.getProposedAt(),
                i.getProposalNote(),
                i.getDecidedOption() == null ? null : i.getDecidedOption().getId(),
                nameOf(i.getDecidedBy()),
                i.getDecidedAt(),
                i.getDecisionNote(),
                i.getCustomerMessage(),
                i.getChargeCustomer(),
                i.getId() == null
                        ? null
                        : charges.findByIncident_Id(i.getId())
                                .map(JobCharge::getAmount)
                                .orElse(null),
                i.getRoutePlan() == null ? null : i.getRoutePlan().getVersionNo(),
                i.getNewTrip() == null ? null : i.getNewTrip().getCode(),
                i.getStatus() == IncidentStatus.OPEN
                        ? jobTrips.horsesOn(leaving.movingTrip(job)).stream()
                                .filter(th -> th.getJob().getId().equals(job.getId()))
                                .map(th -> new IncidentResponse.RidingHorse(
                                        th.getHorse().getId(), th.getHorse().getName()))
                                .toList()
                        : List.of(),
                i.getEtaAt(),
                i.getResolution(),
                i.getClosingNote(),
                i.getResolvedAt(),
                nameOf(i.getResolvedBy()),
                i.getId() == null ? List.of() : timelines(List.of(i.getId())).getOrDefault(i.getId(), List.of()));
    }

    static String nameOf(User user) {
        return user == null ? null : user.recordName();
    }
}
