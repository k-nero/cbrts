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
    public Page<TripViewResponse> escortTrips(User user, Pageable pageable) {
        return crew.findByUser_Id(user.getId(), pageable).map(CrewAssignment::getJob).map(this::view);
    }

    @Transactional(readOnly = true)
    public Page<TripViewResponse> coordinatorTrips(Pageable pageable) { return jobs.findActiveTrips(pageable).map(this::view); }

    @Transactional(readOnly = true)
    public Page<TripViewResponse> customerTrips(User user, Pageable pageable) {
        if (user.getClub() == null) return Page.empty(pageable);
        return jobs.findAllByClubId(user.getClub().getId(), pageable).map(this::view);
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
        TransportJob job = job(code);
        if (!crew.existsByJob_IdAndUser_Id(job.getId(), user.getId())) throw ResourceNotFoundException.of("Trip", code);
        return addRecord(job, user, request, Channel.CAB_TABLET);
    }

    @Transactional
    public TripRecordResponse addCoordinatorRecord(String code, User user, TripRecordRequest request) {
        return addRecord(job(code), user, request, Channel.WEB);
    }

    private TripRecordResponse addRecord(TransportJob job, User user, TripRecordRequest request, Channel channel) {
        var existing = records.findByClientRef(request.clientRef());
        if (existing.isPresent()) {
            if (!existing.get().getJob().getId().equals(job.getId()))
                throw new ConflictException("TRIP_RECORD_REFERENCE_USED", "This client reference belongs to another trip");
            return mapRecord(existing.get());
        }
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
        if (request.conditions() != null) for (TripConditionRequest condition : request.conditions()) {
            if (!seen.add(condition.horseId())) throw new BusinessException("DUPLICATE_HORSE_CONDITION", "A horse can appear only once in a condition check");
            RequestHorse requestHorse = requestHorses.findByRequest_IdAndHorse_Id(job.getRequest().getId(), condition.horseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Horse on trip", condition.horseId()));
            ConditionLog log = new ConditionLog(); log.setTripRecord(record);
            log.setHorse(requestHorse.getHorse());
            log.setCondition(condition.condition()); log.setDrinking(condition.drinking()); log.setEating(condition.eating()); log.setNote(condition.note());
            if (condition.photoFileIds() != null) for (UUID fileId : condition.photoFileIds())
                if (!log.getFiles().add(files.requireAttachable(fileId, user)))
                    throw new BusinessException("DUPLICATE_PHOTO", "A photo can be attached only once to a condition entry");
            record.getConditionLogs().add(log);
        }
        TripRecord saved = records.save(record);
        updateJobStatus(job, request.kind(), request.occurredAt(), stop);
        writeAudit(saved, user, channel, stop);
        return mapRecord(saved);
    }

    private void updateJobStatus(TransportJob job, TripRecordKind kind, Instant at, RouteStop stop) {
        switch (kind) {
            case DEPARTED, FLIGHT_DEPARTED -> { job.setTripStatus(TripStatus.DEPARTED); job.setStage(JobStage.TRIP); if (job.getDepartedAt() == null) job.setDepartedAt(at); }
            case HELD -> { job.setTripStatus(TripStatus.HELD); job.setStage(JobStage.TRIP); }
            case LEFT_STOP, CLEARED_BORDER -> { if (job.getTripStatus() == TripStatus.HELD) job.setTripStatus(TripStatus.DEPARTED); }
            case FLIGHT_LANDED -> { job.setTripStatus(TripStatus.ARRIVED); job.setStage(JobStage.TRIP); }
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
        entry.setActorLabel((user.getFirstName() + " " + user.getLastName()).strip());
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
}
