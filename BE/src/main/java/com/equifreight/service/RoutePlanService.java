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
    private final JobTripService jobTrips;
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
            JobTripService jobTrips,
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
        this.jobTrips = jobTrips;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<RoutePlanResponse> getRoutePlans(UUID jobId) {
        return jobTrips.findTripOf(jobId)
                .map(trip -> routePlanRepository.findByTrip_IdOrderByVersionNoDesc(trip.getId()).stream()
                        .map(plan -> toResponse(plan, jobId))
                        .toList())
                .orElse(List.of());
    }

    /** The job's route plan for the endpoint: 404 when the job has none yet. */
    @Transactional(readOnly = true)
    public RoutePlanResponse getActiveRoutePlan(UUID jobId) {
        return findActiveRoutePlan(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("No route plan found for job: " + jobId));
    }

    /**
     * The confirmed route plan, else the latest draft; empty for a job not planned yet, such as one just approved.
     * Callers inside their own transaction use this rather than catching {@link #getActiveRoutePlan}'s 404: an
     * exception leaving a {@code @Transactional} method marks the shared transaction rollback-only, and the caller's
     * commit then fails with a 500.
     */
    @Transactional(readOnly = true)
    public Optional<RoutePlanResponse> findActiveRoutePlan(UUID jobId) {
        return jobTrips.findTripOf(jobId)
                .flatMap(trip -> routePlanRepository
                        .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED)
                        .or(() -> routePlanRepository.findFirstByTrip_IdOrderByVersionNoDesc(trip.getId())))
                .map(plan -> toResponse(plan, jobId));
    }

    @Transactional
    public RoutePlanResponse createOrUpdateDraft(UUID jobId, CreateRoutePlanRequest request, User currentUser) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));
        Trip trip = jobTrips.tripOf(jobId);

        // Find the trip's draft or create its next version
        Optional<RoutePlan> draftOpt = routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT);
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
            Optional<RoutePlan> latest = routePlanRepository.findFirstByTrip_IdOrderByVersionNoDesc(trip.getId());
            if (latest.isPresent()) {
                nextVersion = (short) (latest.get().getVersionNo() + 1);
            }
            plan = new RoutePlan();
            plan.setTrip(trip);
            plan.setVersionNo(nextVersion);
            plan.setStatus(RoutePlanStatus.DRAFT);
        }

        plan.setDistanceKm(request.distanceKm());
        plan.setDurationMin(request.durationMin());
        plan.setChangeReason(request.changeReason());
        RoutePlan savedPlan = routePlanRepository.save(plan);

        // Save stops
        Map<Short, RouteStop> stopSeqMap = new HashMap<>();
        for (CreateRoutePlanRequest.StopItem item : request.stops()) {
            RouteStop stop = new RouteStop();
            stop.setRoutePlan(savedPlan);
            stop.setSeq(item.seq());
            stop.setKind(item.kind());
            stop.setPlannedAt(item.plannedAt());
            stop.setPlannedStayMin(item.plannedStayMin());
            stop.setDetails(item.details());
            // The trip's one job is picked up and delivered; shared trips name each job's own stops (US-F3-11).
            if (item.kind() == RouteStopKind.PICKUP || item.kind() == RouteStopKind.DELIVERY) {
                stop.setJob(job);
            }

            if (item.kind() == RouteStopKind.BORDER) {
                if (item.borderCrossingId() == null) {
                    throw new BusinessException("A BORDER stop requires a border crossing ID");
                }
                BorderCrossing bc = borderCrossingRepository
                        .findById(item.borderCrossingId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException("Border crossing not found: " + item.borderCrossingId()));
                stop.setBorderCrossing(bc);
            } else {
                if (item.placeId() != null) {
                    Place place = placeRepository
                            .findById(item.placeId())
                            .orElseThrow(() -> new ResourceNotFoundException("Place not found: " + item.placeId()));
                    stop.setPlace(place);
                }
            }

            RouteStop savedStop = routeStopRepository.save(stop);
            stopSeqMap.put(item.seq(), savedStop);
            savedPlan.getStops().add(savedStop);
        }

        // Save legs
        for (CreateRoutePlanRequest.LegItem item : request.legs()) {
            RouteStop fromStop = stopSeqMap.get(item.fromStopSeq());
            RouteStop toStop = stopSeqMap.get(item.toStopSeq());

            if (fromStop == null || toStop == null) {
                throw new BusinessException(
                        "Leg connects non-existing stop sequences: " + item.fromStopSeq() + " -> " + item.toStopSeq());
            }

            RouteLeg leg = new RouteLeg();
            leg.setRoutePlan(savedPlan);
            leg.setSeq(item.seq());
            leg.setFromStop(fromStop);
            leg.setToStop(toStop);
            leg.setMode(item.mode());
            leg.setDistanceKm(item.distanceKm());
            leg.setPlannedMin(item.plannedMin());

            if (item.mode() == TransportMode.ROAD && item.vehicleId() != null) {
                Vehicle vehicle = vehicleRepository
                        .findById(item.vehicleId())
                        .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + item.vehicleId()));
                leg.setVehicle(vehicle);
            }

            RouteLeg savedLeg = routeLegRepository.save(leg);

            if (item.mode() == TransportMode.AIR && item.flight() != null) {
                Flight flight = new Flight();
                flight.setRouteLeg(savedLeg);
                flight.setAirline(item.flight().airline());
                flight.setFlightNo(item.flight().flightNo());
                flight.setAirWaybill(item.flight().airWaybill());
                flight.setAircraftType(item.flight().aircraftType());
                flight.setStallPositions(item.flight().stallPositions());
                flight.setServiceClass(item.flight().serviceClass());
                flight.setScheduledDepartureAt(item.flight().scheduledDepartureAt());
                flight.setScheduledArrivalAt(item.flight().scheduledArrivalAt());
                flightRepository.save(flight);
            }

            savedPlan.getLegs().add(savedLeg);
        }

        return toResponse(savedPlan, jobId);
    }

    @Transactional
    public RoutePlanResponse confirmRoutePlan(UUID jobId, UUID routePlanId, String changeReason, User currentUser) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        RoutePlan plan = routePlanRepository
                .findById(routePlanId)
                .orElseThrow(() -> new ResourceNotFoundException("Route plan not found: " + routePlanId));

        Trip trip = jobTrips.tripOf(jobId);
        if (!plan.getTrip().getId().equals(trip.getId())) {
            throw new BusinessException("Route plan does not belong to job " + jobId);
        }

        if (job.getDepartedAt() != null) {
            throw new BusinessException("Cannot change route plan after job has departed");
        }

        if (plan.getStops().size() < 2) {
            throw new BusinessException("A route plan must contain at least 2 stops (pickup and delivery)");
        }
        // The trip reaches ARRIVED only at a DELIVERY stop, so a plan without one could never be delivered.
        if (plan.getStops().getFirst().getKind() != RouteStopKind.PICKUP
                || plan.getStops().getLast().getKind() != RouteStopKind.DELIVERY) {
            throw new BusinessException("A route plan must start with the pickup and end with the delivery stop");
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

        // Supersede any currently CONFIRMED route plan for this trip
        Optional<RoutePlan> currentConfirmed =
                routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED);
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
        pickup.ifPresent(p -> {
            job.setPlannedDepartureAt(p.getPlannedAt());
            trip.setPlannedDepartureAt(p.getPlannedAt());
        });

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
        return toResponse(saved, jobId);
    }

    public RoutePlanResponse toResponse(RoutePlan plan, UUID jobId) {
        Map<UUID, Flight> flightsByLegId = new HashMap<>();
        for (RouteLeg leg : plan.getLegs()) {
            flightRepository.findByRouteLegId(leg.getId()).ifPresent(f -> flightsByLegId.put(leg.getId(), f));
        }
        return JobMapper.toRoutePlanResponse(plan, jobId, flightsByLegId);
    }
}
