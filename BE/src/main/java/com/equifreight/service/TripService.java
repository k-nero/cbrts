package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.trip.*;
import com.equifreight.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class TripService {
    private final TransportJobRepository jobs;
    private final CrewAssignmentRepository crew;
    private final TripRecordRepository records;
    private final RoutePlanRepository routes;
    private final LoadPlanRepository loads;
    private final RequestHorseRepository requestHorses;
    private final FileService files;
    private final AuditLogRepository audit;

    public TripService(TransportJobRepository jobs, CrewAssignmentRepository crew, TripRecordRepository records,
                       RoutePlanRepository routes, LoadPlanRepository loads, RequestHorseRepository requestHorses,
                       FileService files, AuditLogRepository audit) {
        this.jobs = jobs; this.crew = crew; this.records = records; this.routes = routes; this.loads = loads;
        this.requestHorses = requestHorses; this.files = files; this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Page<TripSummaryResponse> escortTrips(User user, Pageable pageable) {
        return crew.findTripSummariesByUserId(user.getId(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<TripSummaryResponse> coordinatorTrips(Pageable pageable) { return jobs.findActiveTrips(pageable); }

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
    public TripViewResponse coordinatorTrip(String code) { return view(job(code)); }

    @Transactional(readOnly = true)
    public TripViewResponse customerTrip(String code, User user) {
        TransportJob job = job(code);
        if (user.getClub() == null || !job.getRequest().getClub().getId().equals(user.getClub().getId()))
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
                throw new ConflictException("TRIP_RECORD_REFERENCE_USED", "This client reference belongs to another trip");
            return mapRecord(existing.get());
        }
        boolean late = validateTransition(job, request.kind(), request.occurredAt());
        boolean hasConditions = request.conditions() != null && !request.conditions().isEmpty();
        if (request.kind() == TripRecordKind.CONDITION_CHECK && !hasConditions)
            throw new BusinessException("CONDITION_LOG_REQUIRED", "A condition check must include at least one horse observation");
        if (request.kind() != TripRecordKind.CONDITION_CHECK && hasConditions)
            throw new BusinessException("CONDITION_CHECK_KIND_REQUIRED", "Horse observations must be submitted as a condition check");
        if ((request.kind() == TripRecordKind.DEPARTED || request.kind() == TripRecordKind.FLIGHT_DEPARTED)
                && (job.getDossierStatus() != DossierStatus.CLEARANCE_READY || job.getClearanceReadyAt() == null
                || job.getClearanceReadyAt().isAfter(request.occurredAt())))
            throw new BusinessException("CLEARANCE_REQUIRED", "Departure cannot be recorded before the dossier is CLEARANCE_READY");
        RouteStop stop = null;
        if (request.routeStopId() != null) {
            RoutePlan plan = routes.findTopByJob_IdAndStatusOrderByVersionNoDesc(job.getId(), RoutePlanStatus.CONFIRMED)
                    .orElseThrow(() -> ResourceNotFoundException.of("Confirmed route", job.getCode()));
            stop = plan.getStops().stream().filter(s -> s.getId().equals(request.routeStopId())).findFirst()
                    .orElseThrow(() -> ResourceNotFoundException.of("Route stop", request.routeStopId()));
        }
        TripRecord record = new TripRecord();
        record.setJob(job); record.setRouteStop(stop); record.setKind(request.kind());
        record.setOccurredAt(request.occurredAt()); record.setReceivedAt(Instant.now());
        record.setClientRef(request.clientRef()); record.setRecordedBy(user); record.setChannel(channel); record.setText(request.text());
        Set<UUID> seen = new HashSet<>();
        Set<UUID> attachedFiles = new HashSet<>();
        if (request.conditions() != null) for (TripConditionRequest condition : request.conditions()) {
            if (!seen.add(condition.horseId())) throw new BusinessException("DUPLICATE_HORSE_CONDITION", "A horse can appear only once in a condition check");
            RequestHorse requestHorse = requestHorses.findByRequest_IdAndHorse_Id(job.getRequest().getId(), condition.horseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Horse on trip", condition.horseId()));
            ConditionLog log = new ConditionLog(); log.setTripRecord(record);
            log.setHorse(requestHorse.getHorse());
            log.setCondition(condition.condition()); log.setDrinking(condition.drinking()); log.setEating(condition.eating()); log.setNote(condition.note());
            if (condition.photoFileIds() != null) for (UUID fileId : condition.photoFileIds()) {
                if (!attachedFiles.add(fileId))
                    throw new BusinessException("DUPLICATE_PHOTO", "A photo can be attached only once to a condition entry");
                log.getFiles().add(files.requireAttachable(fileId, user));
            }
            record.getConditionLogs().add(log);
        }
        TripRecord saved = records.save(record);
        // A record synced late from the cab joins the log in time order but never moves the status back.
        if (!late) updateJobStatus(job, request.kind(), request.occurredAt(), stop);
        writeAudit(saved, user, channel, stop);
        return mapRecord(saved);
    }

    /** Events that move the trip status; a record older than the newest of these is a late sync. */
    private static final Set<TripRecordKind> STATUS_EVENTS = EnumSet.of(TripRecordKind.DEPARTED, TripRecordKind.FLIGHT_DEPARTED,
            TripRecordKind.HELD, TripRecordKind.LEFT_STOP, TripRecordKind.CLEARED_BORDER, TripRecordKind.FLIGHT_LANDED,
            TripRecordKind.ARRIVED_AT_STOP, TripRecordKind.DELIVERED, TripRecordKind.HANDED_OVER);
    /** What a late-synced record may be: observations and checkpoints, never a lifecycle step. */
    private static final Set<TripRecordKind> LOG_ONLY_WHEN_LATE = EnumSet.of(TripRecordKind.NOTE, TripRecordKind.CONDITION_CHECK,
            TripRecordKind.ARRIVED_AT_STOP, TripRecordKind.CLEARED_BORDER, TripRecordKind.LEFT_STOP,
            TripRecordKind.ACCEPTED_BY_AIRLINE, TripRecordKind.RELEASED_BY_AIRLINE);
    /** Tablet and server clocks drift; anything further ahead than this is a wrong clock, not a record. */
    private static final Duration CLOCK_SKEW = Duration.ofMinutes(5);

    /**
     * Checks the event against the trip's state and returns true when it is a late sync: a record made
     * offline in the cab that reaches the server after a newer status event. Late records are kept for the
     * log but don't change the status; lifecycle steps (loading, departure, hold, delivery, handover) must
     * still arrive in order.
     */
    private boolean validateTransition(TransportJob job, TripRecordKind kind, Instant occurredAt) {
        TripStatus status = job.getTripStatus();
        if (occurredAt.isAfter(Instant.now().plus(CLOCK_SKEW)))
            throw new BusinessException("TRIP_RECORD_IN_FUTURE", "A trip update can't be recorded for a time that hasn't happened yet. Check the device clock.");
        if (job.getStage() == JobStage.CLOSED)
            throw transitionConflict(status, "A closed trip cannot receive new journey events.");

        Instant newestStatusEvent = records.findTopByJob_IdAndKindInOrderByOccurredAtDesc(job.getId(), STATUS_EVENTS)
                .map(TripRecord::getOccurredAt).orElse(null);
        if (newestStatusEvent != null && occurredAt.isBefore(newestStatusEvent)) {
            boolean afterDeparture = job.getDepartedAt() != null && !occurredAt.isBefore(job.getDepartedAt());
            if (!LOG_ONLY_WHEN_LATE.contains(kind) || !afterDeparture)
                throw transitionConflict(status, "This %s is older than the trip's latest status update; record it as a note instead.".formatted(kind));
            return true;
        }

        if (job.getStage() == JobStage.HANDOVER && (status != TripStatus.DELIVERED
                || !EnumSet.of(TripRecordKind.HANDED_OVER, TripRecordKind.NOTE).contains(kind)))
            throw transitionConflict(status, "Only handover or a note can be recorded at the handover stage.");
        if (job.getStage() == JobStage.HANDOVER
                && records.existsByJob_IdAndKind(job.getId(), TripRecordKind.HANDED_OVER)
                && kind != TripRecordKind.NOTE)
            throw transitionConflict(status, "Only a note can be added after handover.");

        boolean allowed = switch (status) {
            // A condition check at loading is the baseline for any later welfare question.
            case NOT_STARTED -> EnumSet.of(TripRecordKind.LOADED, TripRecordKind.CONDITION_CHECK, TripRecordKind.NOTE,
                    TripRecordKind.DEPARTED, TripRecordKind.FLIGHT_DEPARTED).contains(kind);
            // Landing keeps the trip in transit: release by the airline, import customs and the ground leg follow.
            case DEPARTED -> EnumSet.of(TripRecordKind.ARRIVED_AT_STOP, TripRecordKind.CLEARED_BORDER, TripRecordKind.HELD,
                    TripRecordKind.LEFT_STOP, TripRecordKind.CONDITION_CHECK, TripRecordKind.ACCEPTED_BY_AIRLINE,
                    TripRecordKind.FLIGHT_DEPARTED, TripRecordKind.FLIGHT_LANDED, TripRecordKind.RELEASED_BY_AIRLINE,
                    TripRecordKind.NOTE).contains(kind);
            case HELD -> EnumSet.of(TripRecordKind.LEFT_STOP, TripRecordKind.CLEARED_BORDER,
                    TripRecordKind.CONDITION_CHECK, TripRecordKind.NOTE).contains(kind);
            case ARRIVED -> EnumSet.of(TripRecordKind.DELIVERED, TripRecordKind.CONDITION_CHECK, TripRecordKind.NOTE).contains(kind);
            case DELIVERED -> EnumSet.of(TripRecordKind.HANDED_OVER, TripRecordKind.NOTE).contains(kind);
        };
        if (!allowed) throw transitionConflict(status, "A %s can't be recorded at this point of the trip.".formatted(kind));
        return false;
    }

    private static ConflictException transitionConflict(TripStatus status, String reason) {
        return new ConflictException("TRIP_STATE_CONFLICT", "%s Current trip status: %s.".formatted(reason, status));
    }

    private void updateJobStatus(TransportJob job, TripRecordKind kind, Instant at, RouteStop stop) {
        switch (kind) {
            case DEPARTED, FLIGHT_DEPARTED -> { job.setTripStatus(TripStatus.DEPARTED); job.setStage(JobStage.TRIP); if (job.getDepartedAt() == null) job.setDepartedAt(at); }
            case HELD -> { job.setTripStatus(TripStatus.HELD); job.setStage(JobStage.TRIP); }
            case LEFT_STOP, CLEARED_BORDER -> { if (job.getTripStatus() == TripStatus.HELD) job.setTripStatus(TripStatus.DEPARTED); }
            case FLIGHT_LANDED -> job.setStage(JobStage.TRIP);
            case ARRIVED_AT_STOP -> {
                if (stop != null && stop.getKind() == RouteStopKind.DELIVERY) job.setTripStatus(TripStatus.ARRIVED);
            }
            case DELIVERED -> { job.setTripStatus(TripStatus.DELIVERED); job.setStage(JobStage.HANDOVER); if (job.getDeliveredAt() == null) job.setDeliveredAt(at); }
            case HANDED_OVER -> { job.setTripStatus(TripStatus.DELIVERED); job.setStage(JobStage.HANDOVER); }
            default -> { }
        }
    }

    private void writeAudit(TripRecord record, User user, Channel channel, RouteStop stop) {
        AuditLog entry = new AuditLog(); entry.setOccurredAt(Instant.now()); entry.setActor(user);
        entry.setActorLabel(user.displayName());
        entry.setActorRole(user.getRoles().stream().map(Role::getName).findFirst().orElse(null));
        entry.setChannel(channel); entry.setDeviceRecordedAt(record.getOccurredAt()); entry.setAction("TRIP_RECORD_RECORDED");
        entry.setSummary("Recorded %s for %s%s".formatted(record.getKind(), record.getJob().getCode(), stop == null ? "" : " at " + stopName(stop)));
        entry.setEntityType("TRIP_RECORD"); entry.setEntityId(record.getId()); entry.setEntityCode(record.getJob().getCode());
        entry.setAfter("{\"kind\":\"%s\",\"routeStopId\":%s}".formatted(record.getKind(), stop == null ? "null" : "\"" + stop.getId() + "\""));
        audit.save(entry);
    }

    private TripViewResponse view(TransportJob job) {
        List<TripRecord> tripRecords = records.findByJob_IdOrderByOccurredAtAsc(job.getId());
        Map<UUID, TripRecord> latest = new HashMap<>();
        tripRecords.stream().filter(r -> r.getRouteStop() != null).forEach(r -> latest.put(r.getRouteStop().getId(), r));
        List<TripStopResponse> stops = routes.findTopByJob_IdAndStatusOrderByVersionNoDesc(job.getId(), RoutePlanStatus.CONFIRMED)
                .map(p -> p.getStops().stream().map(s -> {
                    TripRecord r = latest.get(s.getId());
                    return new TripStopResponse(s.getId(), s.getSeq(), s.getKind().name(), stopName(s), s.getPlannedAt(), s.getPlannedStayMin(), s.getDetails(),
                            r == null ? null : r.getKind(), r == null ? null : r.getOccurredAt(), r == null ? null : r.getText(),
                            r == null || r.getRecordedBy() == null ? null : (r.getRecordedBy().getFirstName() + " " + r.getRecordedBy().getLastName()).strip());
                }).toList()).orElse(List.of());
        LoadPlan load = loads.findTopByJob_IdAndStatusOrderByConfirmedAtDesc(job.getId(), LoadPlanStatus.CONFIRMED).orElse(null);
        Map<UUID, String> stalls = new HashMap<>();
        if (load != null) load.getStalls().forEach(s -> stalls.put(s.getHorse().getId(), "Stall %d · %s".formatted(s.getVehicleStall().getPositionNo(), s.getVehicleStall().getStallType().name().toLowerCase(Locale.ROOT))));
        List<TripHorseResponse> horses = requestHorses.findByRequest_Id(job.getRequest().getId()).stream()
                .map(rh -> new TripHorseResponse(rh.getHorse().getId(), rh.getHorse().getName(), stalls.get(rh.getHorse().getId()))).toList();
        return new TripViewResponse(job.getCode(), job.getTripStatus(), job.getDossierStatus() == DossierStatus.CLEARANCE_READY,
                job.getPlannedDepartureAt(), job.getPlannedArrivalAt(), job.getWindowStart(), job.getWindowEnd(),
                job.getRequest().getOriginPlace() == null ? null : job.getRequest().getOriginPlace().getName(),
                job.getRequest().getDestinationPlace() == null ? null : job.getRequest().getDestinationPlace().getName(),
                load == null ? null : load.getVehicle().getCode(), stops, horses, tripRecords.stream().map(this::mapRecord).toList());
    }

    private TripRecordResponse mapRecord(TripRecord record) {
        return new TripRecordResponse(record.getId(), record.getRouteStop() == null ? null : record.getRouteStop().getId(),
                record.getRouteStop() == null ? null : stopName(record.getRouteStop()), record.getKind(), record.getOccurredAt(),
                record.getReceivedAt(), record.getClientRef(), record.getRecordedBy() == null ? null : (record.getRecordedBy().getFirstName() + " " + record.getRecordedBy().getLastName()).strip(),
                record.getChannel(), record.getText(), record.getConditionLogs().stream().map(log -> new TripConditionResponse(
                        log.getHorse().getId(), log.getHorse().getName(), log.getCondition(), log.getDrinking(), log.getEating(), log.getNote(),
                        log.getFiles().stream().map(file -> new TripPhotoResponse(file.getId(), file.getFileName(), file.getContentType(), "/api/v1/files/" + file.getId() + "/content?inline=true")).toList()
                )).toList());
    }

    private static String stopName(RouteStop stop) {
        return stop.getBorderCrossing() != null ? stop.getBorderCrossing().getName() : stop.getPlace() == null ? stop.getKind().name() : stop.getPlace().getName();
    }

    private TransportJob job(String code) { return jobs.findByCode(code).orElseThrow(() -> ResourceNotFoundException.of("Trip", code)); }
    private TransportJob jobForUpdate(String code) { return jobs.findByCodeForUpdate(code).orElseThrow(() -> ResourceNotFoundException.of("Trip", code)); }
}
