package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.*;
import com.equifreight.repository.*;
import java.time.Instant;
import java.util.*;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Log4j2
public class RoutePlanService {

    private final RoutePlanRepository routePlanRepository;
    private final RouteStopRepository routeStopRepository;
    private final RouteLegRepository routeLegRepository;
    private final FlightRepository flightRepository;
    private final TransportJobRepository transportJobRepository;
    private final PlaceRepository placeRepository;
    private final BorderCrossingRepository borderCrossingRepository;
    private final VehicleRepository vehicleRepository;
    private final ClearanceService clearanceService;
    private final AuditService auditService;

    public RoutePlanService(
            RoutePlanRepository routePlanRepository,
            RouteStopRepository routeStopRepository,
            RouteLegRepository routeLegRepository,
            FlightRepository flightRepository,
            TransportJobRepository transportJobRepository,
            PlaceRepository placeRepository,
            BorderCrossingRepository borderCrossingRepository,
            VehicleRepository vehicleRepository,
            ClearanceService clearanceService,
            AuditService auditService) {
        this.routePlanRepository = routePlanRepository;
        this.routeStopRepository = routeStopRepository;
        this.routeLegRepository = routeLegRepository;
        this.flightRepository = flightRepository;
        this.transportJobRepository = transportJobRepository;
        this.placeRepository = placeRepository;
        this.borderCrossingRepository = borderCrossingRepository;
        this.vehicleRepository = vehicleRepository;
        this.clearanceService = clearanceService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<RoutePlanResponse> getRoutePlans(UUID jobId) {
        return routePlanRepository.findByJobIdOrderByVersionNoDesc(jobId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoutePlanResponse getActiveRoutePlan(UUID jobId) {
        // Return CONFIRMED if present, otherwise latest DRAFT
        Optional<RoutePlan> confirmed = routePlanRepository.findByJobIdAndStatus(jobId, RoutePlanStatus.CONFIRMED);
        if (confirmed.isPresent()) {
            return toResponse(confirmed.get());
        }

        RoutePlan latest = routePlanRepository
                .findFirstByJobIdOrderByVersionNoDesc(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("No route plan found for job: " + jobId));
        return toResponse(latest);
    }

    @Transactional
    public RoutePlanResponse createOrUpdateDraft(UUID jobId, CreateRoutePlanRequest request, User currentUser) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        // Find existing draft or create next version
        Optional<RoutePlan> draftOpt = routePlanRepository.findByJobIdAndStatus(jobId, RoutePlanStatus.DRAFT);
        RoutePlan plan;
        if (draftOpt.isPresent()) {
            plan = draftOpt.get();
            // Clear existing stops and legs
            routeLegRepository.deleteAll(plan.getLegs());
            routeStopRepository.deleteAll(plan.getStops());
            plan.getLegs().clear();
            plan.getStops().clear();
        } else {
            short nextVersion = 1;
            Optional<RoutePlan> latest = routePlanRepository.findFirstByJobIdOrderByVersionNoDesc(jobId);
            if (latest.isPresent()) {
                nextVersion = (short) (latest.get().getVersionNo() + 1);
            }
            plan = new RoutePlan();
            plan.setJob(job);
            plan.setVersionNo(nextVersion);
            plan.setStatus(RoutePlanStatus.DRAFT);
        }

        plan.setDistanceKm(request.getDistanceKm());
        plan.setDurationMin(request.getDurationMin());
        plan.setChangeReason(request.getChangeReason());
        RoutePlan savedPlan = routePlanRepository.save(plan);

        // Save stops
        Map<Short, RouteStop> stopSeqMap = new HashMap<>();
        for (CreateRoutePlanRequest.StopItem item : request.getStops()) {
            RouteStop stop = new RouteStop();
            stop.setRoutePlan(savedPlan);
            stop.setSeq(item.getSeq());
            stop.setKind(item.getKind());
            stop.setPlannedAt(item.getPlannedAt());
            stop.setPlannedStayMin(item.getPlannedStayMin());
            stop.setDetails(item.getDetails());

            if (item.getKind() == RouteStopKind.BORDER) {
                if (item.getBorderCrossingId() == null) {
                    throw new BusinessException("A BORDER stop requires a border crossing ID");
                }
                BorderCrossing bc = borderCrossingRepository
                        .findById(item.getBorderCrossingId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Border crossing not found: " + item.getBorderCrossingId()));
                stop.setBorderCrossing(bc);
            } else {
                if (item.getPlaceId() != null) {
                    Place place = placeRepository
                            .findById(item.getPlaceId())
                            .orElseThrow(() -> new ResourceNotFoundException("Place not found: " + item.getPlaceId()));
                    stop.setPlace(place);
                }
            }

            RouteStop savedStop = routeStopRepository.save(stop);
            stopSeqMap.put(item.getSeq(), savedStop);
            savedPlan.getStops().add(savedStop);
        }

        // Save legs
        for (CreateRoutePlanRequest.LegItem item : request.getLegs()) {
            RouteStop fromStop = stopSeqMap.get(item.getFromStopSeq());
            RouteStop toStop = stopSeqMap.get(item.getToStopSeq());

            if (fromStop == null || toStop == null) {
                throw new BusinessException("Leg connects non-existing stop sequences: " + item.getFromStopSeq()
                        + " -> " + item.getToStopSeq());
            }

            RouteLeg leg = new RouteLeg();
            leg.setRoutePlan(savedPlan);
            leg.setSeq(item.getSeq());
            leg.setFromStop(fromStop);
            leg.setToStop(toStop);
            leg.setMode(item.getMode());
            leg.setDistanceKm(item.getDistanceKm());
            leg.setPlannedMin(item.getPlannedMin());

            if (item.getMode() == TransportMode.ROAD && item.getVehicleId() != null) {
                Vehicle vehicle = vehicleRepository
                        .findById(item.getVehicleId())
                        .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + item.getVehicleId()));
                leg.setVehicle(vehicle);
            }

            RouteLeg savedLeg = routeLegRepository.save(leg);

            if (item.getMode() == TransportMode.AIR && item.getFlight() != null) {
                Flight flight = new Flight();
                flight.setRouteLeg(savedLeg);
                flight.setAirline(item.getFlight().getAirline());
                flight.setFlightNo(item.getFlight().getFlightNo());
                flight.setAirWaybill(item.getFlight().getAirWaybill());
                flight.setAircraftType(item.getFlight().getAircraftType());
                flight.setStallPositions(item.getFlight().getStallPositions());
                flight.setServiceClass(item.getFlight().getServiceClass());
                flight.setScheduledDepartureAt(item.getFlight().getScheduledDepartureAt());
                flight.setScheduledArrivalAt(item.getFlight().getScheduledArrivalAt());
                flightRepository.save(flight);
            }

            savedPlan.getLegs().add(savedLeg);
        }

        return toResponse(savedPlan);
    }

    @Transactional
    public RoutePlanResponse confirmRoutePlan(UUID jobId, UUID routePlanId, String changeReason, User currentUser) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        RoutePlan plan = routePlanRepository
                .findById(routePlanId)
                .orElseThrow(() -> new ResourceNotFoundException("Route plan not found: " + routePlanId));

        if (plan.getJob() == null || !jobId.equals(plan.getJob().getId())) {
            throw new BusinessException("Route plan does not belong to job " + jobId);
        }

        if (job.getDepartedAt() != null) {
            throw new BusinessException("Cannot change route plan after job has departed");
        }

        if (plan.getStops().size() < 2) {
            throw new BusinessException("A route plan must contain at least 2 stops (pickup and delivery)");
        }

        // Arrival window check: if the job has an arrival window, delivery stop plannedAt must be before windowEnd
        if (job.getWindowEnd() != null) {
            Optional<RouteStop> deliveryStop = plan.getStops().stream()
                    .filter(s -> s.getKind() == RouteStopKind.DELIVERY)
                    .findFirst();

            if (deliveryStop.isPresent() && deliveryStop.get().getPlannedAt() != null) {
                Instant deliveryTime = deliveryStop.get().getPlannedAt();
                if (deliveryTime.isAfter(job.getWindowEnd())) {
                    throw new BusinessException("Delivery stop planned time " + deliveryTime
                            + " is after the arrival window close " + job.getWindowEnd());
                }
            }
        }

        // Supersede any currently CONFIRMED route plan for this job
        Optional<RoutePlan> currentConfirmed =
                routePlanRepository.findByJobIdAndStatus(jobId, RoutePlanStatus.CONFIRMED);
        if (currentConfirmed.isPresent() && !currentConfirmed.get().getId().equals(plan.getId())) {
            RoutePlan oldPlan = currentConfirmed.get();
            oldPlan.setStatus(RoutePlanStatus.SUPERSEDED);
            oldPlan.setSupersededAt(Instant.now());
            oldPlan.setChangeReason(
                    changeReason != null ? changeReason : "Superseded by route plan version " + plan.getVersionNo());
            routePlanRepository.save(oldPlan);
        }

        plan.setStatus(RoutePlanStatus.CONFIRMED);
        plan.setConfirmedBy(currentUser);
        plan.setConfirmedAt(Instant.now());
        if (changeReason != null) {
            plan.setChangeReason(changeReason);
        }
        RoutePlan saved = routePlanRepository.save(plan);

        // Update planned departure and arrival on job
        Optional<RouteStop> pickup = plan.getStops().stream()
                .filter(s -> s.getKind() == RouteStopKind.PICKUP)
                .findFirst();
        pickup.ifPresent(p -> job.setPlannedDepartureAt(p.getPlannedAt()));

        Optional<RouteStop> delivery = plan.getStops().stream()
                .filter(s -> s.getKind() == RouteStopKind.DELIVERY)
                .findFirst();
        delivery.ifPresent(d -> job.setPlannedArrivalAt(d.getPlannedAt()));

        // Invalidate prior sign-off when route plan changes
        job.setSignedOffAt(null);
        job.setSignedOffBy(null);
        transportJobRepository.save(job);

        // Re-evaluate document validity and clearance gate
        clearanceService.recheckJobDocuments(job.getId());

        auditService.recordDecision(
                currentUser,
                "CONFIRM_ROUTE_PLAN",
                "Confirmed route plan v" + saved.getVersionNo() + " for job " + job.getCode(),
                "ROUTE_PLAN",
                saved.getId(),
                job.getCode(),
                changeReason,
                currentConfirmed.map(c -> "v" + c.getVersionNo()).orElse(null),
                "v" + saved.getVersionNo());

        log.info("Confirmed route plan v{} for job {}", plan.getVersionNo(), job.getCode());
        return toResponse(saved);
    }

    public RoutePlanResponse toResponse(RoutePlan plan) {
        List<RouteStopResponse> stopResponses = plan.getStops().stream()
                .map(s -> RouteStopResponse.builder()
                        .id(s.getId())
                        .seq(s.getSeq())
                        .kind(s.getKind())
                        .placeId(s.getPlace() != null ? s.getPlace().getId() : null)
                        .placeName(s.getPlace() != null ? s.getPlace().getName() : null)
                        .borderCrossingId(
                                s.getBorderCrossing() != null
                                        ? s.getBorderCrossing().getId()
                                        : null)
                        .borderCrossingName(
                                s.getBorderCrossing() != null
                                        ? s.getBorderCrossing().getName()
                                        : null)
                        .plannedAt(s.getPlannedAt())
                        .plannedStayMin(s.getPlannedStayMin())
                        .details(s.getDetails())
                        .build())
                .toList();

        List<RouteLegResponse> legResponses = plan.getLegs().stream()
                .map(leg -> {
                    FlightResponse flightResp = null;
                    Optional<Flight> fOpt = flightRepository.findByRouteLegId(leg.getId());
                    if (fOpt.isPresent()) {
                        Flight f = fOpt.get();
                        flightResp = FlightResponse.builder()
                                .id(f.getId())
                                .airline(f.getAirline())
                                .flightNo(f.getFlightNo())
                                .airWaybill(f.getAirWaybill())
                                .aircraftType(f.getAircraftType())
                                .stallPositions(f.getStallPositions())
                                .serviceClass(f.getServiceClass())
                                .scheduledDepartureAt(f.getScheduledDepartureAt())
                                .scheduledArrivalAt(f.getScheduledArrivalAt())
                                .estimatedDepartureAt(f.getEstimatedDepartureAt())
                                .estimatedArrivalAt(f.getEstimatedArrivalAt())
                                .build();
                    }

                    return RouteLegResponse.builder()
                            .id(leg.getId())
                            .seq(leg.getSeq())
                            .fromStopId(leg.getFromStop().getId())
                            .toStopId(leg.getToStop().getId())
                            .mode(leg.getMode())
                            .vehicleId(
                                    leg.getVehicle() != null ? leg.getVehicle().getId() : null)
                            .vehicleCode(
                                    leg.getVehicle() != null ? leg.getVehicle().getCode() : null)
                            .distanceKm(leg.getDistanceKm())
                            .plannedMin(leg.getPlannedMin())
                            .flight(flightResp)
                            .build();
                })
                .toList();

        return RoutePlanResponse.builder()
                .id(plan.getId())
                .jobId(plan.getJob().getId())
                .versionNo(plan.getVersionNo())
                .status(plan.getStatus())
                .distanceKm(plan.getDistanceKm())
                .durationMin(plan.getDurationMin())
                .confirmedByName(
                        plan.getConfirmedBy() != null
                                ? plan.getConfirmedBy().getFirstName() + " "
                                        + plan.getConfirmedBy().getLastName()
                                : null)
                .confirmedAt(plan.getConfirmedAt())
                .supersededAt(plan.getSupersededAt())
                .changeReason(plan.getChangeReason())
                .stops(stopResponses)
                .legs(legResponses)
                .build();
    }
}
