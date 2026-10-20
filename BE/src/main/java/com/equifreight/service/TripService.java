package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.trip.*;
import com.equifreight.repository.*;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Page;
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
    private final UserRepository users;
    private final FileService files;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public TripService(
            TransportJobRepository jobs,
            CrewAssignmentRepository crew,
            TripRecordRepository records,
            RoutePlanRepository routes,
            LoadPlanRepository loads,
            RequestHorseRepository requestHorses,
            HandoverRepository handovers,
            UserRepository users,
            FileService files,
            AuditService audit,
            NotificationService notifications,
            Clock clock) {
        this.jobs = jobs;
        this.crew = crew;
        this.records = records;
        this.routes = routes;
        this.loads = loads;
        this.requestHorses = requestHorses;
        this.handovers = handovers;
        this.users = users;
        this.files = files;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    private static ConflictException transitionConflict(TripStatus status, String reason) {
        return new ConflictException("TRIP_STATE_CONFLICT", "%s Current trip status: %s.".formatted(reason, status));
    }

    @Transactional(readOnly = true)
    public Page<TripSummaryResponse> escortTrips(User user, Pageable pageable) {
        return crew.findTripSummariesByUserId(user.getId(), pageable);
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
        if (!crew.existsByJob_IdAndUser_Id(job.getId(), user.getId())) throw ResourceNotFoundException.of("Trip", code);
        return view(job);
    }

    @Transactional(readOnly = true)
    public TripViewResponse coordinatorTrip(String code) {
        return view(job(code));
    }

    @Transactional(readOnly = true)
    public TripViewResponse customerTrip(String code, User user) {
        TransportJob job = job(code);
        if (user.getClub() == null
                || !job.getRequest().getClub().getId().equals(user.getClub().getId()))
            throw ResourceNotFoundException.of("Trip", code);
        return view(job);
    }

    @Transactional
    public TripRecordResponse addEscortRecord(String code, User user, TripRecordRequest request) {
        TransportJob job = jobForUpdate(code);
        if (!crew.existsByJob_IdAndUser_Id(job.getId(), user.getId())) throw ResourceNotFoundException.of("Trip", code);
        return addRecord(job, user, request, Channel.CAB_TABLET);
    }

    @Transactional
    public TripRecordResponse addCoordinatorRecord(String code, User user, TripRecordRequest request) {
        return addRecord(jobForUpdate(code), user, request, Channel.WEB);
    }

    private TripRecordResponse addRecord(TransportJob job, User user, TripRecordRequest request, Channel channel) {
        var existing = records.findByClientRef(request.clientRef());
        if (existing.isPresent()) {
            if (!existing.get().getJob().getId().equals(job.getId()))
                throw new ConflictException(
                        "TRIP_RECORD_REFERENCE_USED", "This client reference belongs to another trip");
            return TripMapper.toRecordResponse(existing.get());
        }
        boolean late = validateTransition(job, request.kind(), request.occurredAt(), channel);
        boolean hasConditions =
                request.conditions() != null && !request.conditions().isEmpty();
        if (request.kind() == TripRecordKind.CONDITION_CHECK && !hasConditions)
            throw new BusinessException(
                    "CONDITION_LOG_REQUIRED", "A condition check must include at least one horse observation");
        if (request.kind() != TripRecordKind.CONDITION_CHECK && hasConditions)
            throw new BusinessException(
                    "CONDITION_CHECK_KIND_REQUIRED", "Horse observations must be submitted as a condition check");
        String receiverName =
                request.receiverName() == null ? "" : request.receiverName().strip();
        if (request.kind() == TripRecordKind.HANDED_OVER && receiverName.isEmpty())
            throw new BusinessException("RECEIVER_REQUIRED", "Enter the name of the person who received the horses");
        if (request.kind() == TripRecordKind.DEPARTED || request.kind() == TripRecordKind.FLIGHT_DEPARTED)
            requireDepartureAllowed(job, request.occurredAt());
        RouteStop stop = null;
        if (request.routeStopId() != null) {
            RoutePlan plan = routes.findTopByJob_IdAndStatusOrderByVersionNoDesc(job.getId(), RoutePlanStatus.CONFIRMED)
                    .orElseThrow(() -> ResourceNotFoundException.of("Confirmed route", job.getCode()));
            stop = plan.getStops().stream()
                    .filter(s -> s.getId().equals(request.routeStopId()))
                    .findFirst()
                    .orElseThrow(() -> ResourceNotFoundException.of("Route stop", request.routeStopId()));
        }
        TripRecord record = new TripRecord();
        record.setJob(job);
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
                RequestHorse requestHorse = requestHorses
                        .findByRequest_IdAndHorse_Id(job.getRequest().getId(), condition.horseId())
                        .orElseThrow(() -> ResourceNotFoundException.of("Horse on trip", condition.horseId()));
                ConditionLog log = new ConditionLog();
                log.setTripRecord(record);
                log.setHorse(requestHorse.getHorse());
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
            updateJobStatus(job, request.kind(), request.occurredAt(), stop);
            recordHandover(job, request.kind(), request.occurredAt(), receiverName);
            if (request.kind() == TripRecordKind.HELD) alertHold(job, stop, request.text());
        }
        writeAudit(saved, user, channel, stop);
        return TripMapper.toRecordResponse(saved);
    }

    /**
     * The first departure needs the cleared dossier and the manager's sign-off of the trip plan (US-F2-08,
     * US-F3-08). A later FLIGHT_DEPARTED, the next leg of a trip already on its way, only re-checks the gate.
     */
    private static void requireDepartureAllowed(TransportJob job, Instant occurredAt) {
        if (job.getDossierStatus() != DossierStatus.CLEARANCE_READY
                || job.getClearanceReadyAt() == null
                || job.getClearanceReadyAt().isAfter(occurredAt))
            throw new BusinessException(
                    "CLEARANCE_REQUIRED", "Departure cannot be recorded before the dossier is CLEARANCE_READY");
        if (job.getDepartedAt() == null && job.getSignedOffAt() == null)
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
    private boolean validateTransition(TransportJob job, TripRecordKind kind, Instant occurredAt, Channel channel) {
        TripStatus status = job.getTripStatus();
        if (occurredAt.isAfter(Instant.now(clock).plus(CLOCK_SKEW)))
            throw new BusinessException(
                    "TRIP_RECORD_IN_FUTURE",
                    "A trip update can't be recorded for a time that hasn't happened yet. Check the device clock.");
        if (job.getStage() == JobStage.CLOSED)
            throw transitionConflict(status, "A closed trip cannot receive new journey events.");

        Instant newestStatusEvent = records.findTopByJob_IdAndKindInOrderByOccurredAtDesc(job.getId(), STATUS_EVENTS)
                .map(TripRecord::getOccurredAt)
                .orElse(null);
        if (newestStatusEvent != null && occurredAt.isBefore(newestStatusEvent)) {
            boolean afterDeparture = job.getDepartedAt() != null && !occurredAt.isBefore(job.getDepartedAt());
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
                && records.existsByJob_IdAndKind(job.getId(), TripRecordKind.HANDED_OVER)
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

    private void updateJobStatus(TransportJob job, TripRecordKind kind, Instant at, RouteStop stop) {
        switch (kind) {
            case DEPARTED, FLIGHT_DEPARTED -> {
                job.setTripStatus(TripStatus.DEPARTED);
                job.setStage(JobStage.TRIP);
                if (job.getDepartedAt() == null) job.setDepartedAt(at);
            }
            case HELD -> {
                job.setTripStatus(TripStatus.HELD);
                job.setStage(JobStage.TRIP);
            }
            case LEFT_STOP, CLEARED_BORDER -> {
                if (job.getTripStatus() == TripStatus.HELD) job.setTripStatus(TripStatus.DEPARTED);
            }
            case FLIGHT_LANDED -> job.setStage(JobStage.TRIP);
            case ARRIVED_AT_STOP -> {
                if (stop != null && stop.getKind() == RouteStopKind.DELIVERY) job.setTripStatus(TripStatus.ARRIVED);
            }
            case DELIVERED -> {
                job.setTripStatus(TripStatus.DELIVERED);
                job.setStage(JobStage.HANDOVER);
                if (job.getDeliveredAt() == null) job.setDeliveredAt(at);
            }
            case HANDED_OVER -> {
                job.setTripStatus(TripStatus.DELIVERED);
                job.setStage(JobStage.HANDOVER);
            }
            default -> {}
        }
    }

    /**
     * The job's handover row: opened by the delivery, completed by the handover with who received the horses
     * and when the customer's confirmation is due. Late minutes and the penalty are Flow 5's to fill.
     */
    private void recordHandover(TransportJob job, TripRecordKind kind, Instant at, String receiverName) {
        if (kind != TripRecordKind.DELIVERED && kind != TripRecordKind.HANDED_OVER) return;
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
            for (User recipient : users.findByRoleAndStatus(role, UserStatus.ACTIVE))
                notifications.sendNotification(recipient, "TRIP_HELD", title, body, "TRANSPORT_JOB", job.getId());
    }

    private void writeAudit(TripRecord record, User user, Channel channel, RouteStop stop) {
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
                                record.getJob().getCode(),
                                stop == null ? "" : " at " + TripMapper.stopName(stop))),
                "TRIP_RECORD",
                record.getId(),
                record.getJob().getCode(),
                after);
    }

    private TripViewResponse view(TransportJob job) {
        List<TripRecord> tripRecords = records.findByJob_IdOrderByOccurredAtAsc(job.getId());
        Map<UUID, TripRecord> latest = new HashMap<>();
        tripRecords.stream()
                .filter(r -> r.getRouteStop() != null)
                .forEach(r -> latest.put(r.getRouteStop().getId(), r));
        List<TripStopResponse> stops = routes.findTopByJob_IdAndStatusOrderByVersionNoDesc(
                        job.getId(), RoutePlanStatus.CONFIRMED)
                .map(p -> p.getStops().stream()
                        .map(s -> TripMapper.toStopResponse(s, latest.get(s.getId())))
                        .toList())
                .orElse(List.of());
        LoadPlan load = loads.findTopByJob_IdAndStatusOrderByConfirmedAtDesc(job.getId(), LoadPlanStatus.CONFIRMED)
                .orElse(null);
        Map<UUID, LoadPlanStall> stalls = new HashMap<>();
        if (load != null) load.getStalls().forEach(s -> stalls.put(s.getHorse().getId(), s));
        List<TripHorseResponse> horses = requestHorses
                .findByRequest_Id(job.getRequest().getId())
                .stream()
                .map(rh -> TripMapper.toHorseResponse(
                        rh.getHorse(), stalls.get(rh.getHorse().getId())))
                .toList();
        return TripMapper.toViewResponse(
                job,
                load == null ? null : load.getVehicle().getCode(),
                stops,
                horses,
                tripRecords.stream().map(TripMapper::toRecordResponse).toList());
    }

    private TransportJob job(String code) {
        return jobs.findByCode(code).orElseThrow(() -> ResourceNotFoundException.of("Trip", code));
    }

    private TransportJob jobForUpdate(String code) {
        return jobs.findByCodeForUpdate(code).orElseThrow(() -> ResourceNotFoundException.of("Trip", code));
    }
}
