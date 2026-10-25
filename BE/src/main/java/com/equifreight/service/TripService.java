package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.JobMapper;
import com.equifreight.model.trip.*;
import com.equifreight.repository.*;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TripService {
    /**
     * Events that move the trip status; a record older than the newest of these is a late sync.
     */
    private static final Set<TripRecordKind> STATUS_EVENTS = EnumSet.of(
            TripRecordKind.DEPARTED,
            TripRecordKind.FLIGHT_DEPARTED,
            TripRecordKind.HELD,
            TripRecordKind.LEFT_STOP,
            TripRecordKind.CLEARED_BORDER,
            TripRecordKind.FLIGHT_LANDED,
            TripRecordKind.ARRIVED_AT_STOP,
            TripRecordKind.DELIVERED,
            TripRecordKind.HANDED_OVER);
    /**
     * What a late-synced record may be: observations and checkpoints, never a lifecycle step.
     */
    private static final Set<TripRecordKind> LOG_ONLY_WHEN_LATE = EnumSet.of(
            TripRecordKind.NOTE,
            TripRecordKind.CONDITION_CHECK,
            TripRecordKind.ARRIVED_AT_STOP,
            TripRecordKind.CLEARED_BORDER,
            TripRecordKind.LEFT_STOP,
            TripRecordKind.ACCEPTED_BY_AIRLINE,
            TripRecordKind.RELEASED_BY_AIRLINE);
    /**
     * The events that end a hold. Staff decide them (DESIGN.md, escort cab: "until Yến decides"); from the
     * cab a held trip takes notes and welfare checks only.
     */
    private static final Set<TripRecordKind> HOLD_RELEASES =
            EnumSet.of(TripRecordKind.LEFT_STOP, TripRecordKind.CLEARED_BORDER);
    /**
     * Tablet and server clocks drift; anything further ahead than this is a wrong clock, not a record.
     */
    private static final Duration CLOCK_SKEW = Duration.ofMinutes(5);
    /**
     * The customer confirms the handover within 2 days (database-design.md, handovers.confirm_due_at).
     */
    private static final Duration CONFIRM_WINDOW = Duration.ofDays(2);

    private final TransportJobRepository jobs;
    private final CrewAssignmentRepository crew;
    private final TripRecordRepository records;
    private final RoutePlanRepository routes;
    private final LoadPlanRepository loads;
    private final RequestHorseRepository requestHorses;
    private final HandoverRepository handovers;
    private final FileService files;
    private final AuditService audit;
    private final NotificationService notifications;
    private final JobTripService jobTrips;
    private final FlightRepository flightsByLeg;
    private final Clock clock;

    public TripService(
            TransportJobRepository jobs,
            CrewAssignmentRepository crew,
            TripRecordRepository records,
            RoutePlanRepository routes,
            LoadPlanRepository loads,
            RequestHorseRepository requestHorses,
            HandoverRepository handovers,
            FileService files,
            AuditService audit,
            NotificationService notifications,
            JobTripService jobTrips,
            FlightRepository flightsByLeg,
            Clock clock) {
        this.jobs = jobs;
        this.crew = crew;
        this.records = records;
        this.routes = routes;
        this.loads = loads;
        this.requestHorses = requestHorses;
        this.handovers = handovers;
        this.files = files;
        this.audit = audit;
        this.notifications = notifications;
        this.jobTrips = jobTrips;
        this.flightsByLeg = flightsByLeg;
        this.clock = clock;
    }

    private static ConflictException transitionConflict(TripStatus status, String reason) {
        return new ConflictException("TRIP_STATE_CONFLICT", "%s Current trip status: %s.".formatted(reason, status));
    }

    /**
     * The escort's trips, one row per trip however many jobs it carries (US-F3-14): the crew work one trailer, not one
     * job. An escort has a handful of trips, so they are folded and paged here rather than in the query.
     */
    @Transactional(readOnly = true)
    public Page<TripSummaryResponse> escortTrips(User user, Pageable pageable) {
        Map<String, List<TripSummaryResponse>> byTrip = new LinkedHashMap<>();
        crew.findTripRowsByUserId(user.getId(), pageable.getSort())
                .forEach(row -> byTrip.computeIfAbsent(row.tripCode(), k -> new ArrayList<>())
                        .add(row));
        List<TripSummaryResponse> rows =
                byTrip.values().stream().map(TripService::oneRow).toList();
        int from = (int) Math.min(pageable.getOffset(), rows.size());
        int to = Math.min(from + pageable.getPageSize(), rows.size());
        return new PageImpl<>(rows.subList(from, to), pageable, rows.size());
    }

    /** A trip's rows as one: it opens on its first job not yet delivered, and lists every job it carries. */
    private static TripSummaryResponse oneRow(List<TripSummaryResponse> rows) {
        TripSummaryResponse lead = rows.stream()
                .filter(r -> r.tripStatus() != TripStatus.DELIVERED)
                .findFirst()
                .orElse(rows.getFirst());
        return new TripSummaryResponse(
                lead.jobCode(),
                lead.tripStatus(),
                lead.origin(),
                lead.destination(),
                lead.lastUpdate(),
                lead.tripCode(),
                rows.stream().map(TripSummaryResponse::jobCode).sorted().toList());
    }

    @Transactional(readOnly = true)
    public Page<TripSummaryResponse> coordinatorTrips(Pageable pageable) {
        return jobs.findActiveTrips(pageable);
    }

    @Transactional(readOnly = true)
    public Page<TripSummaryResponse> customerTrips(User user, Pageable pageable) {
        if (user.getClub() == null) return Page.empty(pageable);
        return jobs.findAllByClubId(user.getClub().getId(), pageable);
    }

    @Transactional(readOnly = true)
    public TripViewResponse escortTrip(String code, User user) {
        TransportJob job = job(code);
        Trip trip = crewedPart(job, user, code);
        // The cab surface is per trailer (US-F3-14): the escort sees the horses on the trailers they ride. The
        // flight crew looks after every horse on the flight, so they see them all (US-F3-15).
        List<CrewAssignment> places = crew.findByTrip_IdAndUser_Id(trip.getId(), user.getId());
        Set<UUID> trailers = new HashSet<>();
        places.stream()
                .filter(c -> c.getTripVehicle() != null)
                .forEach(c -> trailers.add(c.getTripVehicle().getId()));
        boolean onFlight = places.stream().anyMatch(c -> c.getTripVehicle() == null);
        return view(job, trip, true, onFlight ? null : trailers);
    }

    @Transactional(readOnly = true)
    public TripViewResponse coordinatorTrip(String code) {
        return coordinatorTrip(code, null);
    }

    /** The job's trip, or with {@code tripId} one part of a job that spans trips (US-F5-06). */
    @Transactional(readOnly = true)
    public TripViewResponse coordinatorTrip(String code, UUID tripId) {
        TransportJob job = job(code);
        return view(job, partTrip(job, tripId, code), true, null);
    }

    @Transactional(readOnly = true)
    public TripViewResponse customerTrip(String code, User user) {
        return customerTrip(code, user, null);
    }

    @Transactional(readOnly = true)
    public TripViewResponse customerTrip(String code, User user, UUID tripId) {
        TransportJob job = job(code);
        if (user.getClub() == null
                || !job.getRequest().getClub().getId().equals(user.getClub().getId()))
            throw ResourceNotFoundException.of("Trip", code);
        TripViewResponse shown = view(job, partTrip(job, tripId, code), false, null);
        // A journey of several trips (US-F3-16) is followed on one timeline, unless the customer opens one trip.
        List<TripJob> parts = jobTrips.partsOf(job);
        if (tripId != null || parts.stream().noneMatch(p -> p.getNext() != null)) return shown;
        List<TripViewResponse> legs =
                parts.stream().map(p -> view(job, p.getTrip(), false, null)).toList();
        return TripMapper.toJourneyResponse(job, shown, legs);
    }

    @Transactional
    public TripRecordResponse addEscortRecord(String code, User user, TripRecordRequest request) {
        TransportJob job = jobForUpdate(code);
        return addRecord(job, crewedPart(job, user, code), user, request, Channel.CAB_TABLET);
    }

    @Transactional
    public TripRecordResponse addCoordinatorRecord(String code, User user, TripRecordRequest request) {
        return addCoordinatorRecord(code, user, request, null);
    }

    @Transactional
    public TripRecordResponse addCoordinatorRecord(String code, User user, TripRecordRequest request, UUID tripId) {
        TransportJob job = jobForUpdate(code);
        return addRecord(job, partTrip(job, tripId, code), user, request, Channel.WEB);
    }

    /**
     * The part of the job this escort crews, once released to them (US-F5-06): on a job that spans trips, the crew of
     * each trip sees and records their own part.
     */
    private Trip crewedPart(TransportJob job, User user, String code) {
        List<TripJob> parts = new ArrayList<>(jobTrips.partsOf(job));
        java.util.Collections.reverse(parts);
        for (TripJob part : parts) {
            if (part.released() && crew.existsByTrip_IdAndUser_Id(part.getTrip().getId(), user.getId())) {
                return part.getTrip();
            }
        }
        throw ResourceNotFoundException.of("Trip", code);
    }

    /**
     * The part of the job a staff or customer page is about: {@code tripId} when given, else the part on the road
     * (departed, not delivered), else the job's current trip (US-F5-06).
     */
    private Trip partTrip(TransportJob job, UUID tripId, String code) {
        if (tripId != null) {
            return jobTrips.partsOf(job).stream()
                    .map(TripJob::getTrip)
                    .filter(t -> t.getId().equals(tripId))
                    .findFirst()
                    .orElseThrow(() -> ResourceNotFoundException.of("Trip", code));
        }
        return jobTrips.activePartsOf(job).stream()
                .filter(p -> p.departed() && p.getStatus() != TripStatus.DELIVERED)
                .map(TripJob::getTrip)
                .findFirst()
                .orElseGet(() -> jobTrips.tripOf(job.getId()));
    }

    private TripRecordResponse addRecord(
            TransportJob job, Trip trip, User user, TripRecordRequest request, Channel channel) {
        var existing = records.findByClientRef(request.clientRef());
        if (existing.isPresent()) {
            if (!existing.get().getTrip().getId().equals(trip.getId()))
                throw new ConflictException(
                        "TRIP_RECORD_REFERENCE_USED", "This client reference belongs to another trip");
            return TripMapper.toRecordResponse(existing.get());
        }
        RouteStop stop = null;
        if (request.routeStopId() != null) {
            RoutePlan plan = routes.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED)
                    .orElseThrow(() -> ResourceNotFoundException.of("Confirmed route", job.getCode()));
            stop = plan.getStops().stream()
                    .filter(s -> s.getId().equals(request.routeStopId()))
                    .findFirst()
                    .orElseThrow(() -> ResourceNotFoundException.of("Route stop", request.routeStopId()));
        }
        TransportJob target = target(job, trip, stop);
        boolean late = validateTransition(target, trip, request.kind(), request.occurredAt(), channel);
        boolean hasConditions =
                request.conditions() != null && !request.conditions().isEmpty();
        boolean handover = request.kind() == TripRecordKind.HANDED_OVER;
        if (request.kind() == TripRecordKind.CONDITION_CHECK && !hasConditions)
            throw new BusinessException(
                    "CONDITION_LOG_REQUIRED", "A condition check must include at least one horse observation");
        if (request.kind() != TripRecordKind.CONDITION_CHECK && !handover && hasConditions)
            throw new BusinessException(
                    "CONDITION_CHECK_KIND_REQUIRED", "Horse observations must be submitted as a condition check");
        String receiverName =
                request.receiverName() == null ? "" : request.receiverName().strip();
        // The handover is the proof of a safe delivery (US-F6-01): who took the horses, their confirmation, and the
        // condition of each horse handed over.
        List<Horse> handedOver = handover ? handedOver(trip, target) : List.of();
        if (handover) {
            if (receiverName.isEmpty())
                throw new BusinessException(
                        "RECEIVER_REQUIRED", "Enter the name of the person who received the horses");
            if (!Boolean.TRUE.equals(request.receiverConfirmed()))
                throw new BusinessException(
                        "RECEIVER_CONFIRMATION_REQUIRED",
                        receiverName + " confirms on the tablet that they received the horses as recorded");
            Set<UUID> given = hasConditions
                    ? request.conditions().stream()
                            .map(TripConditionRequest::horseId)
                            .collect(java.util.stream.Collectors.toSet())
                    : Set.of();
            List<String> missing = handedOver.stream()
                    .filter(h -> !given.contains(h.getId()))
                    .map(Horse::getName)
                    .toList();
            if (!missing.isEmpty())
                throw new BusinessException(
                        "HANDOVER_CONDITION_REQUIRED",
                        "Record the condition of every horse handed over; missing: " + String.join(", ", missing));
        }
        if (request.kind() == TripRecordKind.DEPARTED || request.kind() == TripRecordKind.FLIGHT_DEPARTED) {
            requireHandedOn(trip);
            for (TransportJob riding : riding(trip, target))
                requireDepartureAllowed(riding, jobTrips.partOf(trip, riding), request.occurredAt());
        }
        TripRecord record = new TripRecord();
        record.setTrip(trip);
        record.setRouteStop(stop);
        record.setKind(request.kind());
        record.setOccurredAt(request.occurredAt());
        record.setReceivedAt(Instant.now(clock));
        record.setClientRef(request.clientRef());
        record.setRecordedBy(user);
        record.setChannel(channel);
        record.setText(request.text());
        Set<UUID> seen = new HashSet<>();
        Set<UUID> attachedFiles = new HashSet<>();
        if (request.conditions() != null)
            for (TripConditionRequest condition : request.conditions()) {
                if (!seen.add(condition.horseId()))
                    throw new BusinessException(
                            "DUPLICATE_HORSE_CONDITION", "A horse can appear only once in a condition check");
                // Any horse on the trip, whichever job it travels under; at a handover, only the job's own.
                Horse horse = (handover
                                ? handedOver.stream()
                                : jobTrips.horsesOn(trip).stream().map(TripHorse::getHorse))
                        .filter(h -> h.getId().equals(condition.horseId()))
                        .findFirst()
                        .orElseThrow(() -> ResourceNotFoundException.of("Horse on trip", condition.horseId()));
                ConditionLog log = new ConditionLog();
                log.setTripRecord(record);
                log.setHorse(horse);
                log.setCondition(condition.condition());
                log.setDrinking(condition.drinking());
                log.setEating(condition.eating());
                log.setNote(condition.note());
                if (condition.photoFileIds() != null)
                    for (UUID fileId : condition.photoFileIds()) {
                        if (!attachedFiles.add(fileId))
                            throw new BusinessException(
                                    "DUPLICATE_PHOTO", "A photo can be attached only once to a condition entry");
                        log.getFiles().add(files.requireAttachable(fileId, user));
                    }
                record.getConditionLogs().add(log);
            }
        TripRecord saved = records.save(record);
        // A record synced late from the cab joins the log in time order but never moves the status back.
        if (!late) {
            updateJobStatus(target, trip, request.kind(), request.occurredAt(), stop);
            recordHandover(target, saved, receiverName);
            if (request.kind() == TripRecordKind.HELD) alertHold(target, stop, request.text());
        }
        writeAudit(saved, target, user, channel, stop);
        return TripMapper.toRecordResponse(saved);
    }

    /**
     * The job a record is about (US-F3-11): a pickup or delivery stop's own job, else the job in the URL while its
     * horses are still on the trip, else a job still riding. Departures, holds and checkpoints move every job on
     * the trip together; arrivals, deliveries and handovers move only the job whose stop it is.
     */
    private TransportJob target(TransportJob job, Trip trip, RouteStop stop) {
        if (stop != null && stop.getJob() != null) return stop.getJob();
        List<TransportJob> riding = jobTrips.jobsOn(trip);
        if (riding.isEmpty() || riding.stream().anyMatch(j -> j.getId().equals(job.getId()))) return job;
        return riding.getFirst();
    }

    /** The jobs with horses on the trip now; the target alone when the lookup has none. */
    private List<TransportJob> riding(Trip trip, TransportJob target) {
        List<TransportJob> riding = jobTrips.jobsOn(trip);
        return riding.isEmpty() ? List.of(target) : riding;
    }

    /**
     * A later trip of a job's chain leaves only once the trip before has handed the horses on (US-F3-16): it can't
     * depart with horses still waiting at the airport or quarantine station for it.
     */
    private void requireHandedOn(Trip trip) {
        List<String> waiting = jobTrips.waitingFor(trip).stream()
                .map(th -> th.getJob().getCode())
                .distinct()
                .toList();
        if (!waiting.isEmpty())
            throw new BusinessException(
                    "HANDOVER_FROM_PREVIOUS_TRIP_REQUIRED",
                    "Trip " + trip.getCode() + " can't leave before the trip before it hands on the horses of "
                            + String.join(", ", waiting) + ": record their delivery at the transfer first");
    }

    /**
     * The first departure needs the cleared dossier and the manager's sign-off of the trip plan (US-F2-08,
     * US-F3-08). A later FLIGHT_DEPARTED, the next leg of a trip already on its way, only re-checks the gate.
     */
    private void requireDepartureAllowed(TransportJob job, TripJob part, Instant occurredAt) {
        // A part already on its way doesn't wait for the job's other part, whose documents are re-checked for its
        // own new dates (US-F5-06).
        boolean otherPartWaits =
                part.getDepartedAt() != null && jobTrips.activePartsOf(job).size() > 1;
        if (!otherPartWaits
                && (job.getDossierStatus() != DossierStatus.CLEARANCE_READY
                        || job.getClearanceReadyAt() == null
                        || job.getClearanceReadyAt().isAfter(occurredAt)))
            throw new BusinessException(
                    "CLEARANCE_REQUIRED",
                    "Departure cannot be recorded before the dossier of " + job.getCode()
                            + " is CLEARANCE_READY. On a shared trip, take that job off the trip so the others can leave.");
        if (part.getDepartedAt() == null && part.getSignedOffAt() == null)
            throw new BusinessException(
                    "SIGN_OFF_REQUIRED",
                    "Departure cannot be recorded until the logistics manager signs off the trip plan");
    }

    /**
     * Checks the event against the trip's state and returns true when it is a late sync: a record made
     * offline in the cab that reaches the server after a newer status event. Late records are kept for the
     * log but don't change the status; lifecycle steps (loading, departure, hold, delivery, handover) must
     * still arrive in order.
     */
    private boolean validateTransition(
            TransportJob job, Trip trip, TripRecordKind kind, Instant occurredAt, Channel channel) {
        // The job's part on this trip: a job that spans trips moves along each one separately (US-F5-06).
        TripJob part = jobTrips.partOf(trip, job);
        TripStatus status = part.getStatus();
        if (occurredAt.isAfter(Instant.now(clock).plus(CLOCK_SKEW)))
            throw new BusinessException(
                    "TRIP_RECORD_IN_FUTURE",
                    "A trip update can't be recorded for a time that hasn't happened yet. Check the device clock.");
        if (job.getStage() == JobStage.CLOSED)
            throw transitionConflict(status, "A closed trip cannot receive new journey events.");
        if (kind == TripRecordKind.HANDED_OVER && part.getNext() != null)
            throw transitionConflict(
                    status,
                    "The horses are handed on to the next trip of the journey here; the handover to the receiver "
                            + "is recorded at the delivery on the last trip.");

        Instant newestStatusEvent = records.findTopByTrip_IdAndKindInOrderByOccurredAtDesc(trip.getId(), STATUS_EVENTS)
                .map(TripRecord::getOccurredAt)
                .orElse(null);
        if (newestStatusEvent != null && occurredAt.isBefore(newestStatusEvent)) {
            boolean afterDeparture = part.getDepartedAt() != null && !occurredAt.isBefore(part.getDepartedAt());
            if (!LOG_ONLY_WHEN_LATE.contains(kind) || !afterDeparture)
                throw transitionConflict(
                        status,
                        "This %s is older than the trip's latest status update; record it as a note instead."
                                .formatted(TripMapper.label(kind)));
            return true;
        }

        if (status == TripStatus.HELD && channel == Channel.CAB_TABLET && HOLD_RELEASES.contains(kind))
            throw new BusinessException(
                    "HOLD_RELEASE_BY_STAFF",
                    "The trip is held: the coordinator or the logistics manager decides when it moves on. "
                            + "Record a note or a welfare check meanwhile.");

        if (job.getStage() == JobStage.HANDOVER
                && (status != TripStatus.DELIVERED
                        || !EnumSet.of(TripRecordKind.HANDED_OVER, TripRecordKind.NOTE)
                                .contains(kind)))
            throw transitionConflict(status, "Only handover or a note can be recorded at the handover stage.");
        if (job.getStage() == JobStage.HANDOVER
                && handovers
                        .findByJob_Id(job.getId())
                        .map(h -> h.getConfirmDueAt() != null)
                        .orElse(false)
                && kind != TripRecordKind.NOTE)
            throw transitionConflict(status, "Only a note can be added after handover.");

        boolean allowed = switch (status) {
            // A condition check at loading is the baseline for any later welfare question.
            case NOT_STARTED ->
                EnumSet.of(
                                TripRecordKind.LOADED,
                                TripRecordKind.CONDITION_CHECK,
                                TripRecordKind.NOTE,
                                TripRecordKind.DEPARTED,
                                TripRecordKind.FLIGHT_DEPARTED)
                        .contains(kind);
            // Landing keeps the trip in transit: release by the airline, import customs and the ground leg follow.
            case DEPARTED ->
                EnumSet.of(
                                TripRecordKind.ARRIVED_AT_STOP,
                                TripRecordKind.CLEARED_BORDER,
                                TripRecordKind.HELD,
                                TripRecordKind.LEFT_STOP,
                                TripRecordKind.CONDITION_CHECK,
                                TripRecordKind.ACCEPTED_BY_AIRLINE,
                                TripRecordKind.FLIGHT_DEPARTED,
                                TripRecordKind.FLIGHT_LANDED,
                                TripRecordKind.RELEASED_BY_AIRLINE,
                                TripRecordKind.NOTE)
                        .contains(kind);
            case HELD ->
                EnumSet.of(
                                TripRecordKind.LEFT_STOP,
                                TripRecordKind.CLEARED_BORDER,
                                TripRecordKind.CONDITION_CHECK,
                                TripRecordKind.NOTE)
                        .contains(kind);
            case ARRIVED ->
                EnumSet.of(TripRecordKind.DELIVERED, TripRecordKind.CONDITION_CHECK, TripRecordKind.NOTE)
                        .contains(kind);
            case DELIVERED ->
                EnumSet.of(TripRecordKind.HANDED_OVER, TripRecordKind.NOTE).contains(kind);
        };
        if (!allowed)
            throw transitionConflict(
                    status, "%s can't be recorded at this point of the trip.".formatted(TripMapper.label(kind)));
        return false;
    }

    /**
     * Moves the trip's jobs (US-F3-11): a departure, hold, checkpoint or landing moves every job riding the trip; an
     * arrival at a delivery stop, a delivery or a handover moves the job whose stop it is, and its horses come off
     * the trip once delivered. The trip's status follows the jobs still on it, and is DELIVERED when none is.
     */
    private void updateJobStatus(TransportJob target, Trip trip, TripRecordKind kind, Instant at, RouteStop stop) {
        List<TransportJob> riding = riding(trip, target);
        TripJob targetPart = jobTrips.partOf(trip, target);
        // A part that continues on a later trip of the job's chain is handed on there, not delivered (US-F3-16).
        boolean handsOn = targetPart.getNext() != null;
        switch (kind) {
            case DEPARTED, FLIGHT_DEPARTED ->
                riding.forEach(job -> {
                    TripJob part = jobTrips.partOf(trip, job);
                    part.setStatus(TripStatus.DEPARTED);
                    if (part.getDepartedAt() == null) part.setDepartedAt(at);
                    job.setTripStatus(TripStatus.DEPARTED);
                    job.setStage(JobStage.TRIP);
                    if (job.getDepartedAt() == null) job.setDepartedAt(at);
                });
            case HELD ->
                riding.forEach(job -> {
                    jobTrips.partOf(trip, job).setStatus(TripStatus.HELD);
                    job.setTripStatus(TripStatus.HELD);
                    job.setStage(JobStage.TRIP);
                });
            case LEFT_STOP, CLEARED_BORDER ->
                riding.forEach(job -> {
                    TripJob part = jobTrips.partOf(trip, job);
                    if (part.getStatus() == TripStatus.HELD) part.setStatus(TripStatus.DEPARTED);
                    if (job.getTripStatus() == TripStatus.HELD) job.setTripStatus(TripStatus.DEPARTED);
                });
            case FLIGHT_LANDED -> riding.forEach(job -> job.setStage(JobStage.TRIP));
            case ARRIVED_AT_STOP -> {
                if (stop != null && stop.getKind() == RouteStopKind.DELIVERY) {
                    targetPart.setStatus(TripStatus.ARRIVED);
                    target.setTripStatus(TripStatus.ARRIVED);
                }
                // At its transfer the job's part has arrived; the job itself travels on (US-F3-16).
                if (stop != null && stop.getKind() == RouteStopKind.TRANSFER) targetPart.setStatus(TripStatus.ARRIVED);
            }
            case DELIVERED -> {
                targetPart.setStatus(TripStatus.DELIVERED);
                if (targetPart.getDeliveredAt() == null) targetPart.setDeliveredAt(at);
                if (!handsOn) {
                    target.setTripStatus(TripStatus.DELIVERED);
                    target.setStage(JobStage.HANDOVER);
                    if (target.getDeliveredAt() == null) target.setDeliveredAt(at);
                }
            }
            case HANDED_OVER -> {
                targetPart.setStatus(TripStatus.DELIVERED);
                target.setTripStatus(TripStatus.DELIVERED);
                target.setStage(JobStage.HANDOVER);
            }
            default -> {}
        }
        if (targetPart.getStatus() == TripStatus.DELIVERED) {
            if (handsOn) jobTrips.handOn(trip, target);
            else jobTrips.markDelivered(trip, target);
        }
        // The job's own status sums up its parts: a job that spans trips is delivered when every horse is.
        java.util.LinkedHashSet<TransportJob> moved = new java.util.LinkedHashSet<>(riding);
        moved.add(target);
        moved.forEach(jobTrips::summarize);
        List<TransportJob> remaining = jobTrips.jobsOn(trip);
        trip.setStatus(
                remaining.isEmpty()
                        ? targetPart.getStatus()
                        : jobTrips.partOf(trip, remaining.getFirst()).getStatus());
    }

    /** The job's horses delivered on this trip: the ones a handover hands over (not moved on, not left in care). */
    private List<Horse> handedOver(Trip trip, TransportJob job) {
        return jobTrips.horsesEverOn(trip).stream()
                .filter(th -> th.getJob().getId().equals(job.getId()))
                .filter(th -> th.getStatus() == TripHorseStatus.ON_TRIP || th.getStatus() == TripHorseStatus.DELIVERED)
                .map(TripHorse::getHorse)
                .toList();
    }

    /**
     * The job's handover row: opened by the delivery, completed by the handover (US-F6-01) with who received the
     * horses and confirmed it, when, the record that holds each horse's condition, and when the customer's
     * confirmation is due. Once handed over, those never change (handovers_handover_fixed).
     */
    private void recordHandover(TransportJob job, TripRecord record, String receiverName) {
        TripRecordKind kind = record.getKind();
        Instant at = record.getOccurredAt();
        if (kind != TripRecordKind.DELIVERED && kind != TripRecordKind.HANDED_OVER) return;
        // A job that spans trips is handed over once its last horse is (US-F5-06).
        if (job.getTripStatus() != TripStatus.DELIVERED) return;
        Handover handover = handovers.findByJob_Id(job.getId()).orElseGet(() -> {
            Handover created = new Handover();
            created.setJob(job);
            return created;
        });
        if (kind == TripRecordKind.DELIVERED) {
            handover.setDeliveredAt(at);
        } else {
            if (handover.getDeliveredAt() == null) handover.setDeliveredAt(job.getDeliveredAt());
            handover.setReceivingName(receiverName);
            handover.setReceiverConfirmed(true);
            handover.setHandedOverAt(at);
            handover.setHandoverRecord(record);
            handover.setConfirmDueAt(at.plus(CONFIRM_WINDOW));
        }
        handovers.save(handover);
    }

    /** A hold stops the horses on the road: tell the people who decide when it moves on. */
    private void alertHold(TransportJob job, RouteStop stop, String reason) {
        String place = stop == null ? "" : " at " + TripMapper.stopName(stop);
        String title = "Trip %s held%s".formatted(job.getCode(), place);
        String body = reason == null || reason.isBlank() ? "No reason was given from the cab." : reason.strip();
        for (String role : List.of(RoleName.LOGISTICS_MANAGER, RoleName.FLEET_COORDINATOR))
            notifications.notify(NotificationKind.TRIP_HELD, Audience.role(role), Subject.job(job), title, body);
    }

    private void writeAudit(TripRecord record, TransportJob job, User user, Channel channel, RouteStop stop) {
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("kind", record.getKind().name());
        after.put("routeStopId", stop == null ? null : stop.getId());
        audit.recordFromDevice(
                user,
                channel,
                record.getOccurredAt(),
                "TRIP_RECORD_RECORDED",
                AuditText.fit("%s recorded for %s%s"
                        .formatted(
                                TripMapper.label(record.getKind()),
                                job.getCode(),
                                stop == null ? "" : " at " + TripMapper.stopName(stop))),
                "TRIP_RECORD",
                record.getId(),
                job.getCode(),
                after);
    }

    /**
     * The trip as {@code job}'s people see it; {@code staffView} is false for the customer, who never sees the TRP
     * code. {@code trailers} limits the horses and vehicles to the trailers an escort rides; null shows them all.
     */
    private TripViewResponse view(TransportJob job, Trip trip, boolean staffView, Set<UUID> trailers) {
        // The customer sees their own horses and records only: on a shared trip, nothing about the other client
        // (US-F3-11, US-F3-14). Stops of the whole trip (borders, welfare stops) are theirs too, and another job's
        // pickup or delivery is "a stop on the way".
        java.util.function.Predicate<RouteStop> own =
                st -> st.getJob() == null || st.getJob().getId().equals(job.getId());
        Set<UUID> ownHorses = new HashSet<>();
        requestHorses
                .findByRequest_Id(job.getRequest().getId())
                .forEach(rh -> ownHorses.add(rh.getHorse().getId()));
        List<TripHorse> riders = jobTrips.horsesEverOn(trip).stream()
                .filter(th -> th.getStatus() != TripHorseStatus.MOVED)
                .toList();
        boolean shared =
                riders.stream().map(th -> th.getJob().getId()).distinct().count() > 1;
        List<TripRecord> allRecords = records.findByTrip_IdOrderByOccurredAtAsc(trip.getId());
        List<TripRecord> tripRecords = allRecords.stream()
                .filter(r -> staffView || r.getRouteStop() == null || own.test(r.getRouteStop()))
                .toList();
        Map<UUID, TripRecord> latest = new HashMap<>();
        allRecords.stream()
                .filter(r -> r.getRouteStop() != null)
                .forEach(r -> latest.put(r.getRouteStop().getId(), r));
        Optional<RoutePlan> confirmedRoute = routes.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED);
        // The flight everyone on the trip shares; the customer sees their own consignment only (US-F3-15).
        List<TripFlightResponse> flights = confirmedRoute
                .map(p -> p.getLegs().stream()
                        .filter(leg -> leg.getMode() == TransportMode.AIR)
                        .sorted(Comparator.comparing(RouteLeg::getSeq))
                        .flatMap(leg -> flightsByLeg.findByRouteLegId(leg.getId()).stream())
                        .map(f -> new TripFlightResponse(
                                f.getAirline(),
                                f.getFlightNo(),
                                f.getAircraftType(),
                                f.getScheduledDepartureAt(),
                                f.getScheduledArrivalAt(),
                                f.getEstimatedDepartureAt(),
                                f.getEstimatedArrivalAt(),
                                f.getAllocations().stream()
                                        .filter(a ->
                                                staffView || a.getJob().getId().equals(job.getId()))
                                        .map(JobMapper::toAllocationResponse)
                                        .toList()))
                        .toList())
                .orElse(List.of());
        List<TripStopResponse> stops = confirmedRoute
                .map(p -> p.getStops().stream()
                        .map(s -> !staffView && !own.test(s)
                                ? TripMapper.toStopOnTheWay(s, latest.get(s.getId()))
                                : TripMapper.toStopResponse(
                                        s,
                                        latest.get(s.getId()),
                                        staffView && shared && s.getJob() != null
                                                ? s.getJob().getCode()
                                                : null))
                        .toList())
                .orElse(List.of());
        // Every confirmed trailer of the convoy, in order (US-F3-10); the escort's own only.
        List<LoadPlan> confirmed = loads.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()).stream()
                .filter(p -> p.getStatus() == LoadPlanStatus.CONFIRMED)
                .filter(p ->
                        trailers == null || trailers.contains(p.getTripVehicle().getId()))
                .toList();
        Map<UUID, LoadPlanStall> stalls = new HashMap<>();
        confirmed.forEach(
                p -> p.getStalls().forEach(s -> stalls.put(s.getHorse().getId(), s)));
        // Staff and the crew see every horse that rode the trip (the escort those on their trailers); the customer
        // their own.
        // A job split across trips (US-F5-06) shows this part's horses, status and times, and lists every part.
        List<TripHorse> mine = riders.stream()
                .filter(th -> th.getJob().getId().equals(job.getId()))
                .toList();
        TripMapper.Part part = partView(job, trip, confirmedRoute, staffView);
        List<Horse> horsesOnTrip;
        if (trailers != null) {
            horsesOnTrip = riders.stream()
                    .map(TripHorse::getHorse)
                    .filter(h -> stalls.containsKey(h.getId()))
                    .toList();
        } else {
            horsesOnTrip = staffView
                    ? riders.stream().map(TripHorse::getHorse).toList()
                    : part.parts().isEmpty()
                            ? List.of()
                            : mine.stream().map(TripHorse::getHorse).toList();
            if (horsesOnTrip.isEmpty()) {
                horsesOnTrip = requestHorses.findByRequest_Id(job.getRequest().getId()).stream()
                        .map(RequestHorse::getHorse)
                        .toList();
            }
        }
        Map<UUID, String> jobOfHorse = new HashMap<>();
        riders.forEach(th -> jobOfHorse.put(th.getHorse().getId(), th.getJob().getCode()));
        List<TripHorseResponse> horses = horsesOnTrip.stream()
                .map(h -> TripMapper.toHorseResponse(
                        h,
                        stalls.get(h.getId()),
                        confirmed.size() > 1,
                        jobOfHorse.getOrDefault(h.getId(), job.getCode())))
                .toList();
        List<TripRecordResponse> recordResponses = tripRecords.stream()
                .map(TripMapper::toRecordResponse)
                .map(r -> staffView ? r : ownConditions(r, ownHorses))
                .toList();
        return TripMapper.toViewResponse(
                job,
                staffView ? trip.getCode() : null,
                confirmed.isEmpty()
                        ? null
                        : String.join(
                                ", ",
                                confirmed.stream()
                                        .map(p -> p.getVehicle().getCode())
                                        .toList()),
                shared,
                flights,
                stops,
                horses,
                recordResponses,
                part,
                TripMapper.toHandoverResponse(
                        handovers.findByJob_Id(job.getId()).orElse(null)));
    }

    /**
     * This part of the job: on one trip, the job itself; split across trips, the part's status, its departure (the
     * trip's) and its arrival (the job's delivery stop on that trip's confirmed route), with every part listed.
     */
    private TripMapper.Part partView(
            TransportJob job, Trip trip, Optional<RoutePlan> confirmedRoute, boolean staffView) {
        List<TripPartResponse> parts = new ArrayList<>();
        TripMapper.Part current = TripMapper.Part.of(job);
        for (TripJob p : jobTrips.partsOf(job)) {
            List<TripHorse> onPart = jobTrips.horsesEverOn(p.getTrip()).stream()
                    .filter(th -> th.getJob().getId().equals(job.getId()) && th.getStatus() != TripHorseStatus.MOVED)
                    .toList();
            if (onPart.isEmpty()) continue;
            Optional<RoutePlan> route = p.getTrip().getId().equals(trip.getId())
                    ? confirmedRoute
                    : routes.findByTrip_IdAndStatus(p.getTrip().getId(), RoutePlanStatus.CONFIRMED);
            Instant arrival = route.flatMap(r -> r.getStops().stream()
                            .filter(st -> st.getKind() == RouteStopKind.DELIVERY
                                    && st.getJob() != null
                                    && st.getJob().getId().equals(job.getId()))
                            .map(RouteStop::getPlannedAt)
                            .filter(java.util.Objects::nonNull)
                            .findFirst())
                    .orElse(null);
            boolean here = p.getTrip().getId().equals(trip.getId());
            parts.add(new TripPartResponse(
                    p.getTrip().getId(),
                    staffView ? p.getTrip().getCode() : null,
                    p.getStatus(),
                    onPart.stream()
                            .filter(th -> th.getStatus() != TripHorseStatus.LEFT_IN_CARE)
                            .map(th -> th.getHorse().getName())
                            .toList(),
                    onPart.stream()
                            .filter(th -> th.getStatus() == TripHorseStatus.LEFT_IN_CARE)
                            .map(th -> th.getHorse().getName())
                            .toList(),
                    p.getTrip().getPlannedDepartureAt(),
                    arrival,
                    here,
                    Optional.ofNullable(p.getTrip().getCorridor())
                            .map(c -> c.getCode())
                            .orElse(null),
                    Optional.ofNullable(p.getTrip().getCorridor())
                            .map(c -> c.getMode())
                            .orElse(null),
                    p.getNext() != null));
            if (here) {
                // A part shows its own plan only: one still to be planned has no times yet.
                current = new TripMapper.Part(p.getStatus(), p.getTrip().getPlannedDepartureAt(), arrival, List.of());
            }
        }
        if (parts.size() <= 1) return TripMapper.Part.of(job);
        return new TripMapper.Part(current.status(), current.plannedDepartureAt(), current.plannedArrivalAt(), parts);
    }

    /** A record with only the customer's own horses' welfare entries. */
    private static TripRecordResponse ownConditions(TripRecordResponse r, Set<UUID> ownHorses) {
        if (r.conditions() == null || r.conditions().isEmpty()) return r;
        return new TripRecordResponse(
                r.id(),
                r.routeStopId(),
                r.checkpointName(),
                r.kind(),
                r.occurredAt(),
                r.receivedAt(),
                r.clientRef(),
                r.recordedBy(),
                r.channel(),
                r.text(),
                r.conditions().stream()
                        .filter(c -> ownHorses.contains(c.horseId()))
                        .toList());
    }

    private TransportJob job(String code) {
        return jobs.findByCode(code).orElseThrow(() -> ResourceNotFoundException.of("Trip", code));
    }

    private TransportJob jobForUpdate(String code) {
        return jobs.findByCodeForUpdate(code).orElseThrow(() -> ResourceNotFoundException.of("Trip", code));
    }
}
