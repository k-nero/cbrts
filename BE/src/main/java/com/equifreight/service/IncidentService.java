package com.equifreight.service;

import com.equifreight.configuration.BusinessTime;
import com.equifreight.entity.Incident;
import com.equifreight.entity.IncidentOption;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.Trip;
import com.equifreight.entity.TripHorse;
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
import com.equifreight.model.incident.IncidentOptionResponse;
import com.equifreight.model.incident.IncidentResponse;
import com.equifreight.model.incident.IncidentSummaryResponse;
import com.equifreight.model.incident.ProposeOptionRequest;
import com.equifreight.model.incident.RaiseIncidentRequest;
import com.equifreight.model.trip.TripMapper;
import com.equifreight.repository.CrewAssignmentRepository;
import com.equifreight.repository.IncidentRepository;
import com.equifreight.repository.TransportJobRepository;
import com.equifreight.repository.UserRepository;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
 * proposes one for approval (US-F5-02).
 */
@Service
@Log4j2
public class IncidentService {

    /** What the cab can report; HELD comes from the trip log and CUSTOMER_REPORT from the customer. */
    static final Set<IncidentKind> CAB_KINDS =
            EnumSet.of(IncidentKind.VEHICLE, IncidentKind.TRAFFIC, IncidentKind.WELFARE, IncidentKind.OTHER);

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final IncidentRepository incidents;
    private final TransportJobRepository jobs;
    private final CrewAssignmentRepository crew;
    private final UserRepository users;
    private final JobTripService jobTrips;
    private final FileService files;
    private final AuditService audit;
    private final NotificationService notifications;
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
            Clock clock) {
        this.incidents = incidents;
        this.jobs = jobs;
        this.crew = crew;
        this.users = users;
        this.jobTrips = jobTrips;
        this.files = files;
        this.audit = audit;
        this.notifications = notifications;
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
        Trip trip = jobTrips.tripOf(job.getId());
        boolean released = job.getSignedOffAt() != null || job.getTripStatus() != TripStatus.NOT_STARTED;
        if (!released || !crew.existsByTripVehicle_Trip_IdAndUser_Id(trip.getId(), escort.getId())) {
            throw ResourceNotFoundException.of("Trip", jobCode);
        }
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
        String body = incident.getSummary() + " · " + incident.getLocation() + ". Reported by "
                + nameOf(incident.getReportedBy()) + " from the cab at "
                + at.atZone(BusinessTime.ZONE).format(TIME) + ".";
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
                                o.getCreatedAt()))
                        .toList(),
                i.getProposedOption() == null ? null : i.getProposedOption().getId(),
                nameOf(i.getProposedBy()),
                i.getProposedAt(),
                i.getProposalNote());
    }

    static String nameOf(User user) {
        return user == null ? null : user.displayName();
    }
}
