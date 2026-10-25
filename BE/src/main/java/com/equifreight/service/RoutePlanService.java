package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.RoutePlanStatus;
import com.equifreight.entity.enums.RouteStopKind;
import com.equifreight.entity.enums.TransportMode;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.job.*;
import com.equifreight.repository.*;
import java.time.Duration;
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
    private final TripNotices notices;

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
            AuditService auditService,
            TripNotices notices) {
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
        this.notices = notices;
    }

    @Transactional(readOnly = true)
    public List<RoutePlanResponse> getRoutePlans(UUID jobId) {
        return getRoutePlans(jobId, null);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional(readOnly = true)
    public List<RoutePlanResponse> getRoutePlans(UUID jobId, UUID tripId) {
        return jobTrips.findTripOf(jobId, tripId)
                .map(trip -> routePlanRepository.findByTrip_IdOrderByVersionNoDesc(trip.getId()).stream()
                        .map(plan -> toResponse(plan, jobId))
                        .toList())
                .orElse(List.of());
    }

    /** The job's route plan for the endpoint: 404 when the job has none yet. */
    @Transactional(readOnly = true)
    public RoutePlanResponse getActiveRoutePlan(UUID jobId) {
        return getActiveRoutePlan(jobId, null);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional(readOnly = true)
    public RoutePlanResponse getActiveRoutePlan(UUID jobId, UUID tripId) {
        return findActiveRoutePlan(jobId, tripId)
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
        return findActiveRoutePlan(jobId, null);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional(readOnly = true)
    public Optional<RoutePlanResponse> findActiveRoutePlan(UUID jobId, UUID tripId) {
        return jobTrips.findTripOf(jobId, tripId)
                .flatMap(trip -> routePlanRepository
                        .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED)
                        .or(() -> routePlanRepository.findFirstByTrip_IdOrderByVersionNoDesc(trip.getId())))
                .map(plan -> toResponse(plan, jobId));
    }

    @Transactional
    public RoutePlanResponse createOrUpdateDraft(UUID jobId, CreateRoutePlanRequest request, User currentUser) {
        return createOrUpdateDraft(jobId, null, request, currentUser);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional
    public RoutePlanResponse createOrUpdateDraft(
            UUID jobId, UUID tripId, CreateRoutePlanRequest request, User currentUser) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));
        Trip trip = jobTrips.tripOf(jobId, tripId);

        // Find the trip's draft or create its next version
        Optional<RoutePlan> draftOpt = routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT);
        RoutePlan plan;
        // Each job's consignment on the trip's flight, kept when the flight is planned again (US-F3-15).
        Map<UUID, FlightAllocation> consignments = new HashMap<>();
        draftOpt.or(() -> routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .ifPresent(current -> current.getLegs().stream()
                        .filter(leg -> leg.getMode() == TransportMode.AIR)
                        .forEach(leg -> flightRepository
                                .findByRouteLegId(leg.getId())
                                .ifPresent(f -> f.getAllocations()
                                        .forEach(a -> consignments.putIfAbsent(
                                                a.getJob().getId(), a)))));
        if (draftOpt.isPresent()) {
            plan = draftOpt.get();
            // Clear existing stops and legs, the legs' flights first
            plan.getLegs()
                    .forEach(leg ->
                            flightRepository.findByRouteLegId(leg.getId()).ifPresent(flightRepository::delete));
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
            // A pickup, delivery or transfer names its job: the one in the request, else the job in the URL (US-F3-11,
            // US-F3-16).
            if (namesJob(item.kind())) {
                stop.setJob(item.jobId() == null ? job : jobOnTrip(trip, item.jobId()));
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
                flight.setAircraftType(item.flight().aircraftType());
                flight.setStallCapacity(item.flight().stallCapacity());
                flight.setScheduledDepartureAt(item.flight().scheduledDepartureAt());
                flight.setScheduledArrivalAt(item.flight().scheduledArrivalAt());
                allocate(flight, item.flight(), trip, job, consignments);
                flightRepository.save(flight);
            }

            savedPlan.getLegs().add(savedLeg);
        }

        return toResponse(savedPlan, jobId);
    }

    @Transactional
    public RoutePlanResponse confirmRoutePlan(UUID jobId, UUID routePlanId, String changeReason, User currentUser) {
        return confirmRoutePlan(jobId, null, routePlanId, changeReason, currentUser);
    }

    /** As above, for {@code tripId}, one trip of the job's chain (US-F3-16); its current trip when null. */
    @Transactional
    public RoutePlanResponse confirmRoutePlan(
            UUID jobId, UUID tripId, UUID routePlanId, String changeReason, User currentUser) {
        TransportJob job = transportJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        RoutePlan plan = routePlanRepository
                .findById(routePlanId)
                .orElseThrow(() -> new ResourceNotFoundException("Route plan not found: " + routePlanId));

        Trip trip = jobTrips.tripOf(jobId, tripId);
        if (!plan.getTrip().getId().equals(trip.getId())) {
            throw new BusinessException("Route plan does not belong to job " + jobId);
        }

        if (jobTrips.partDeparted(trip, job)) {
            throw new BusinessException("Cannot change route plan after job has departed");
        }

        if (plan.getStops().size() < 2) {
            throw new BusinessException("A route plan must contain at least 2 stops (pickup and delivery)");
        }
        // The trip reaches ARRIVED only at a DELIVERY stop, so a plan without one could never be delivered; a trip of
        // a job's chain ends where it hands the horses on to the next trip instead (US-F3-16).
        if (plan.getStops().getFirst().getKind() != RouteStopKind.PICKUP
                || !ENDS.contains(plan.getStops().getLast().getKind())) {
            throw new BusinessException(
                    "A route plan must start with the pickup and end with the delivery or transfer stop");
        }

        // Every job on the trip is picked up and delivered on this route (US-F3-11), and with an arrival window its
        // delivery stop is planned before the window closes.
        List<TransportJob> jobsOnTrip = jobTrips.jobsOn(trip);
        if (jobsOnTrip.isEmpty()) jobsOnTrip = List.of(job);
        for (TransportJob onTrip : jobsOnTrip) {
            List<RouteStop> own = plan.getStops().stream()
                    .filter(st -> ownerOf(st, job).getId().equals(onTrip.getId()))
                    .toList();
            // A job that continues on a later trip of its chain hands its horses on here instead of delivering them.
            RouteStopKind end = jobTrips.handsOn(trip, onTrip) ? RouteStopKind.TRANSFER : RouteStopKind.DELIVERY;
            if (own.stream().noneMatch(st -> st.getKind() == RouteStopKind.PICKUP)
                    || own.stream().noneMatch(st -> st.getKind() == end)) {
                throw new BusinessException("The route must pick up and "
                        + (end == RouteStopKind.TRANSFER ? "hand on" : "deliver") + " every job on the trip; "
                        + onTrip.getCode() + " has no "
                        + (own.stream().noneMatch(st -> st.getKind() == RouteStopKind.PICKUP)
                                ? "pickup"
                                : end == RouteStopKind.TRANSFER ? "transfer" : "delivery")
                        + " stop");
            }
            if (onTrip.getWindowEnd() != null) {
                own.stream()
                        .filter(st -> st.getKind() == RouteStopKind.DELIVERY && st.getPlannedAt() != null)
                        .filter(st -> st.getPlannedAt().isAfter(onTrip.getWindowEnd()))
                        .findFirst()
                        .ifPresent(st -> {
                            throw new BusinessException("Delivery stop planned time " + st.getPlannedAt()
                                    + " is after the arrival window close " + onTrip.getWindowEnd());
                        });
            }
        }

        // Reconfirming the plan already confirmed changes nothing the customer was told.
        boolean reconfirm = plan.getStatus() == RoutePlanStatus.CONFIRMED;
        Map<UUID, TripNotices.Times> before = TripNotices.timesOf(jobsOnTrip);

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

        // The trip leaves together from its first pickup; each job arrives at its own delivery stop.
        Instant departure = plan.getStops().stream()
                .filter(st -> st.getKind() == RouteStopKind.PICKUP)
                .findFirst()
                .map(RouteStop::getPlannedAt)
                .orElse(null);
        trip.setPlannedDepartureAt(departure);
        for (TransportJob onTrip : jobsOnTrip) {
            // The job leaves when the first trip of its journey does (US-F3-16).
            if (jobTrips.partBefore(trip, onTrip).isEmpty()) onTrip.setPlannedDepartureAt(departure);
            plan.getStops().stream()
                    .filter(st -> st.getKind() == RouteStopKind.DELIVERY
                            && ownerOf(st, job).getId().equals(onTrip.getId()))
                    .findFirst()
                    .ifPresent(d -> onTrip.setPlannedArrivalAt(d.getPlannedAt()));
            // Invalidate prior sign-off when route plan changes
            onTrip.setSignedOffAt(null);
            onTrip.setSignedOffBy(null);
            transportJobRepository.save(onTrip);
            // Re-evaluate document validity and clearance gate
            clearanceService.recheckJobDocuments(onTrip.getId());
        }
        jobTrips.clearSignOff(trip);

        if (!reconfirm) {
            notices.confirmed(trip, saved, jobsOnTrip, before);
        }

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

    /**
     * The trip changed under its confirmed route (a trailer or a job added or taken out): the confirmed version is
     * superseded with {@code reason}, and a new draft version carries its stops and legs for the coordinator to
     * check and confirm again. Nothing is deleted, so the history stays as evidence.
     */
    @Transactional
    public void reopen(Trip trip, String reason) {
        Optional<RoutePlan> confirmed =
                routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED);
        if (confirmed.isEmpty()) {
            return;
        }
        RoutePlan old = confirmed.get();
        old.setStatus(RoutePlanStatus.SUPERSEDED);
        old.setSupersededAt(Instant.now());
        old.setChangeReason(reason);
        routePlanRepository.saveAndFlush(old);
        if (routePlanRepository
                .findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT)
                .isPresent()) {
            return;
        }

        copyOf(old, RoutePlanStatus.DRAFT, reason);
    }

    /**
     * An approved incident option moves the trip's times (US-F5-03): the confirmed route is superseded by a new
     * confirmed version with the same stops and legs, in which every stop the trip hasn't reached yet is
     * {@code delayMinutes} later, and each job's planned arrival (and, before departure, departure) follows it.
     * Returns the new version, or empty when the trip has no confirmed route.
     */
    @Transactional
    public Optional<RoutePlan> reviseForIncident(
            Trip trip, int delayMinutes, Set<UUID> reachedStopIds, String reason, User user) {
        return reviseForIncident(trip, delayMinutes, reachedStopIds, reason, user, Set.of());
    }

    /**
     * As above, and the stops not yet reached of {@code leavingJobs}, jobs whose horses have all left the trip
     * (US-F5-06), are taken off the new version, their neighbours joined.
     */
    @Transactional
    public Optional<RoutePlan> reviseForIncident(
            Trip trip, int delayMinutes, Set<UUID> reachedStopIds, String reason, User user, Set<UUID> leavingJobs) {
        Optional<RoutePlan> confirmed =
                routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED);
        if (confirmed.isEmpty()) return Optional.empty();
        RoutePlan old = confirmed.get();
        old.setStatus(RoutePlanStatus.SUPERSEDED);
        old.setSupersededAt(Instant.now());
        old.setChangeReason(reason);
        routePlanRepository.saveAndFlush(old);

        RoutePlan revised = copyOf(old, RoutePlanStatus.CONFIRMED, reason);
        revised.setConfirmedBy(user);
        revised.setConfirmedAt(Instant.now());
        Duration delay = Duration.ofMinutes(delayMinutes);
        // A moving trip has left its pickups behind, whether or not the cab recorded each one.
        Set<UUID> reached = new HashSet<>(reachedStopIds);
        if (trip.getStatus() != null && trip.getStatus() != com.equifreight.entity.enums.TripStatus.NOT_STARTED) {
            old.getStops().stream()
                    .filter(st -> st.getKind() == RouteStopKind.PICKUP)
                    .forEach(st -> reached.add(st.getId()));
        }
        for (int i = 0; i < old.getStops().size(); i++) {
            RouteStop was = old.getStops().get(i);
            RouteStop now = revised.getStops().get(i);
            if (was.getPlannedAt() != null && !reached.contains(was.getId())) {
                now.setPlannedAt(was.getPlannedAt().plus(delay));
                routeStopRepository.save(now);
            }
        }
        RoutePlan saved = routePlanRepository.save(revised);
        if (!leavingJobs.isEmpty()) {
            List<StopCopy> kept = new ArrayList<>();
            for (int i = 0; i < old.getStops().size(); i++) {
                RouteStop was = old.getStops().get(i);
                RouteStop now = saved.getStops().get(i);
                boolean leaving = now.getJob() != null
                        && leavingJobs.contains(now.getJob().getId());
                if (leaving && !reachedStopIds.contains(was.getId())) continue;
                kept.add(new StopCopy(now, now.getJob(), now.getKind(), now.getPlace(), now.getPlannedAt()));
            }
            rebuild(saved, kept);
        }

        for (TransportJob onTrip : jobTrips.jobsOn(trip)) {
            saved.getStops().stream()
                    .filter(st -> st.getKind() == RouteStopKind.DELIVERY
                            && st.getJob() != null
                            && st.getJob().getId().equals(onTrip.getId()))
                    .findFirst()
                    .ifPresent(d -> onTrip.setPlannedArrivalAt(d.getPlannedAt()));
            if (onTrip.getDepartedAt() == null) {
                saved.getStops().stream()
                        .filter(st -> st.getKind() == RouteStopKind.PICKUP)
                        .findFirst()
                        .map(RouteStop::getPlannedAt)
                        .ifPresent(onTrip::setPlannedDepartureAt);
            }
            transportJobRepository.save(onTrip);
        }
        auditService.recordDecision(
                user,
                "REVISE_ROUTE_PLAN",
                AuditText.fit("Route plan v" + saved.getVersionNo() + " for trip " + trip.getCode() + ": " + reason),
                "ROUTE_PLAN",
                saved.getId(),
                trip.getCode(),
                reason,
                "v" + old.getVersionNo(),
                "v" + saved.getVersionNo());
        return Optional.of(saved);
    }

    /**
     * A new version of the trip's route carrying {@code old}'s stops, legs and flights, in {@code status}. Nothing is
     * deleted, so the history stays as evidence.
     */
    private RoutePlan copyOf(RoutePlan old, RoutePlanStatus status, String reason) {
        Trip trip = old.getTrip();
        RoutePlan plan = new RoutePlan();
        plan.setTrip(trip);
        plan.setVersionNo((short) (routePlanRepository
                        .findFirstByTrip_IdOrderByVersionNoDesc(trip.getId())
                        .map(RoutePlan::getVersionNo)
                        .orElse((short) 0)
                + 1));
        plan.setStatus(status);
        plan.setDistanceKm(old.getDistanceKm());
        plan.setDurationMin(old.getDurationMin());
        plan.setChangeReason(reason);
        plan = routePlanRepository.save(plan);

        Map<UUID, RouteStop> copies = new HashMap<>();
        for (RouteStop stop : old.getStops()) {
            RouteStop copy = new RouteStop();
            copy.setRoutePlan(plan);
            copy.setSeq(stop.getSeq());
            copy.setKind(stop.getKind());
            copy.setJob(stop.getJob());
            copy.setPlace(stop.getPlace());
            copy.setBorderCrossing(stop.getBorderCrossing());
            copy.setPlannedAt(stop.getPlannedAt());
            copy.setPlannedStayMin(stop.getPlannedStayMin());
            copy.setDetails(stop.getDetails());
            copies.put(stop.getId(), routeStopRepository.save(copy));
            plan.getStops().add(copy);
        }
        for (RouteLeg leg : old.getLegs()) {
            RouteLeg copy = new RouteLeg();
            copy.setRoutePlan(plan);
            copy.setSeq(leg.getSeq());
            copy.setFromStop(copies.get(leg.getFromStop().getId()));
            copy.setToStop(copies.get(leg.getToStop().getId()));
            copy.setMode(leg.getMode());
            copy.setVehicle(leg.getVehicle());
            copy.setDistanceKm(leg.getDistanceKm());
            copy.setPlannedMin(leg.getPlannedMin());
            RouteLeg savedLeg = routeLegRepository.save(copy);
            flightRepository.findByRouteLegId(leg.getId()).ifPresent(f -> {
                Flight flight = new Flight();
                flight.setRouteLeg(savedLeg);
                flight.setAirline(f.getAirline());
                flight.setFlightNo(f.getFlightNo());
                flight.setAircraftType(f.getAircraftType());
                flight.setStallCapacity(f.getStallCapacity());
                FlightService.copyAllocations(f, flight);
                flight.setScheduledDepartureAt(f.getScheduledDepartureAt());
                flight.setScheduledArrivalAt(f.getScheduledArrivalAt());
                flight.setEstimatedDepartureAt(f.getEstimatedDepartureAt());
                flight.setEstimatedArrivalAt(f.getEstimatedArrivalAt());
                flightRepository.save(flight);
            });
            plan.getLegs().add(savedLeg);
        }
        return plan;
    }

    /**
     * Gives the flight one consignment per job on the trip (US-F3-15): as the request lists them, else as the job had
     * on the trip's flight before, else its quoted stall positions and class. A waybill is unique on the flight, and
     * the positions fit in what the airline gives the trip.
     */
    private void allocate(
            Flight flight,
            CreateRoutePlanRequest.FlightItem item,
            Trip trip,
            TransportJob job,
            Map<UUID, FlightAllocation> before) {
        List<TransportJob> onTrip = jobTrips.jobsOn(trip);
        if (onTrip.isEmpty()) onTrip = List.of(job);
        Map<UUID, CreateRoutePlanRequest.AllocationItem> asked = new HashMap<>();
        for (CreateRoutePlanRequest.AllocationItem a : item.allocations()) {
            TransportJob owner = a.jobId() == null ? job : jobOnTrip(trip, a.jobId());
            if (asked.put(owner.getId(), a) != null) {
                throw new BusinessException(owner.getCode() + " has two allocations on flight " + item.flightNo());
            }
        }
        Set<String> waybills = new HashSet<>();
        int positions = 0;
        for (TransportJob onFlight : onTrip) {
            FlightAllocation a = FlightService.allocationFor(flight, onFlight);
            CreateRoutePlanRequest.AllocationItem given = asked.get(onFlight.getId());
            FlightAllocation had = before.get(onFlight.getId());
            if (given != null) {
                a.setAirWaybill(
                        given.airWaybill() == null || given.airWaybill().isBlank()
                                ? null
                                : given.airWaybill().strip());
                if (given.stallPositions() != null) a.setStallPositions(given.stallPositions());
                if (given.serviceClass() != null) a.setServiceClass(given.serviceClass());
            } else if (had != null) {
                a.setAirWaybill(had.getAirWaybill());
                a.setStallPositions(had.getStallPositions());
                a.setServiceClass(had.getServiceClass());
            }
            if (a.getAirWaybill() != null && !waybills.add(a.getAirWaybill().toUpperCase(Locale.ROOT))) {
                throw new BusinessException("Air waybill " + a.getAirWaybill() + " is given to two jobs on flight "
                        + item.flightNo() + ": each consignment has its own");
            }
            positions += a.getStallPositions() == null ? 0 : a.getStallPositions();
            flight.getAllocations().add(a);
        }
        if (flight.getStallCapacity() != null && positions > flight.getStallCapacity()) {
            throw new BusinessException("The jobs on the trip take " + positions + " stall positions and flight "
                    + item.flightNo() + " gives " + flight.getStallCapacity());
        }
    }

    /** The stops a trip can end with: a job's delivery, or where it hands a job's horses on (US-F3-16). */
    private static final Set<RouteStopKind> ENDS = EnumSet.of(RouteStopKind.DELIVERY, RouteStopKind.TRANSFER);

    /** Where a job's journey can be split across trips (US-F3-16): the places horses wait between two carriers. */
    private static final Set<RouteStopKind> SPLITS =
            EnumSet.of(RouteStopKind.AIRPORT_OUT, RouteStopKind.AIRPORT_IN, RouteStopKind.QUARANTINE);

    /** The stop kinds that name the job they are for. */
    static boolean namesJob(RouteStopKind kind) {
        return kind == RouteStopKind.PICKUP || kind == RouteStopKind.DELIVERY || kind == RouteStopKind.TRANSFER;
    }

    /** The draft of {@code trip}'s route, after superseding a confirmed version with {@code reason}. */
    private Optional<RoutePlan> draftOf(Trip trip, String reason) {
        reopen(trip, reason);
        return routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT);
    }

    /** A new, empty draft version of {@code trip}'s route. */
    private RoutePlan newDraft(Trip trip, String reason) {
        RoutePlan plan = new RoutePlan();
        plan.setTrip(trip);
        plan.setVersionNo((short) (routePlanRepository
                        .findFirstByTrip_IdOrderByVersionNoDesc(trip.getId())
                        .map(RoutePlan::getVersionNo)
                        .orElse((short) 0)
                + 1));
        plan.setStatus(RoutePlanStatus.DRAFT);
        plan.setChangeReason(reason);
        return routePlanRepository.save(plan);
    }

    /**
     * Splits {@code job}'s journey at the stop numbered {@code stopSeq} on {@code from}'s route (US-F3-16): from then
     * on, the job travels on {@code to}. On {@code from}'s draft the stop becomes the job's TRANSFER, and the job's
     * stops after it (with the trip's own stops when no other job still needs them) move to a new draft of
     * {@code to}'s route, which starts with the job's pickup at the same place. The legs and flights between stops that
     * stay consecutive come along, so a flight from the airport travels with the trip that flies. Returns the stop's
     * place.
     */
    @Transactional
    public Place splitAt(Trip from, Trip to, TransportJob job, short stopSeq, String reason) {
        RoutePlan draft = draftOf(from, reason)
                .orElseThrow(() -> new BusinessException("Plan the route of trip " + from.getCode()
                        + " first: the journey is split at one of its stops"));
        List<RouteStop> stops = draft.getStops();
        int at = -1;
        for (int i = 0; i < stops.size(); i++) if (stops.get(i).getSeq() == stopSeq) at = i;
        if (at < 0) throw new BusinessException("Trip " + from.getCode() + "'s route has no stop " + stopSeq);
        RouteStop split = stops.get(at);
        if (!SPLITS.contains(split.getKind()) || split.getPlace() == null) {
            throw new BusinessException("A journey continues on another trip at an airport or a quarantine station, "
                    + "where the horses wait between carriers");
        }
        boolean delivered = false;
        for (int i = at + 1; i < stops.size(); i++) {
            RouteStop st = stops.get(i);
            if (st.getJob() != null && st.getJob().getId().equals(job.getId()) && ENDS.contains(st.getKind())) {
                delivered = true;
            }
        }
        if (!delivered) {
            throw new BusinessException("The stop is after " + job.getCode() + "'s delivery on trip " + from.getCode()
                    + ": split the journey before it");
        }
        boolean othersAfter = stops.subList(at + 1, stops.size()).stream()
                .anyMatch(st -> st.getJob() != null && !st.getJob().getId().equals(job.getId()));
        boolean splitShared = split.getJob() != null || othersAfter;

        List<StopCopy> staying = new ArrayList<>();
        List<StopCopy> moving = new ArrayList<>();
        for (int i = 0; i <= at; i++) {
            RouteStop st = stops.get(i);
            staying.add(
                    i == at && !splitShared
                            ? new StopCopy(st, job, RouteStopKind.TRANSFER, st.getPlace(), st.getPlannedAt())
                            : copy(st));
        }
        if (splitShared) {
            staying.add(new StopCopy(null, job, RouteStopKind.TRANSFER, split.getPlace(), split.getPlannedAt()));
        }
        Instant ready = split.getPlannedAt() == null || split.getPlannedStayMin() == null
                ? split.getPlannedAt()
                : split.getPlannedAt().plus(Duration.ofMinutes(split.getPlannedStayMin()));
        moving.add(new StopCopy(split, job, RouteStopKind.PICKUP, split.getPlace(), ready));
        for (int i = at + 1; i < stops.size(); i++) {
            RouteStop st = stops.get(i);
            boolean own = st.getJob() != null && st.getJob().getId().equals(job.getId());
            if (own || (st.getJob() == null && !othersAfter)) moving.add(copy(st));
            else staying.add(copy(st));
        }
        Map<String, RouteLeg> legs = legsOf(draft);
        RoutePlan next = routePlanRepository
                .findByTrip_IdAndStatus(to.getId(), RoutePlanStatus.DRAFT)
                .orElseGet(() -> newDraft(to, reason));
        if (next.getStops().isEmpty()) {
            rebuild(next, moving, legs);
        } else {
            // The job joins a trip already planned: its stops go after the trip's own pickups and deliveries.
            addJobStops(to, job, moving);
        }
        rebuild(draft, staying);
        return split.getPlace();
    }

    /**
     * Joins {@code job}'s journey on {@code next} back onto {@code from} (US-F3-16), the reverse of
     * {@link #splitAt}: the job's TRANSFER on {@code from}'s draft becomes the airport or quarantine stop it was, and
     * the job's stops after its pickup on {@code next} (with that trip's own stops when no other job rides it) follow
     * it, keeping their legs and flights. {@code next}'s draft loses the job's stops.
     */
    @Transactional
    public void joinBack(Trip from, Trip next, TransportJob job, boolean nextHasOthers, String reason) {
        RoutePlan draft = draftOf(from, reason).orElse(null);
        RoutePlan later = draftOf(next, reason)
                .or(() -> routePlanRepository.findFirstByTrip_IdOrderByVersionNoDesc(next.getId()))
                .orElse(null);
        if (draft == null) return;
        List<RouteStop> stops = draft.getStops();
        int at = -1;
        for (int i = 0; i < stops.size(); i++) {
            RouteStop st = stops.get(i);
            if (st.getKind() == RouteStopKind.TRANSFER && st.getJob().getId().equals(job.getId())) at = i;
        }
        Map<String, RouteLeg> legs = legsOf(draft);
        List<StopCopy> joined = new ArrayList<>();
        List<RouteStop> after = List.of();
        RouteLeg firstLeg = null;
        if (later != null) {
            List<RouteStop> laterStops = later.getStops();
            int pickup = -1;
            for (int i = 0; i < laterStops.size(); i++) {
                RouteStop st = laterStops.get(i);
                if (pickup < 0
                        && st.getKind() == RouteStopKind.PICKUP
                        && st.getJob().getId().equals(job.getId())) pickup = i;
            }
            if (pickup >= 0) {
                after = laterStops.subList(pickup + 1, laterStops.size()).stream()
                        .filter(st ->
                                (st.getJob() != null && st.getJob().getId().equals(job.getId()))
                                        || (st.getJob() == null && !nextHasOthers))
                        .toList();
                Map<String, RouteLeg> laterLegs = legsOf(later);
                legs.putAll(laterLegs);
                if (!after.isEmpty()) {
                    firstLeg = laterLegs.get(laterStops.get(pickup).getId() + ">"
                            + after.getFirst().getId());
                }
            }
        }
        RouteStop transfer = at < 0 ? null : stops.get(at);
        for (int i = 0; i < stops.size(); i++) {
            RouteStop st = stops.get(i);
            if (i != at) {
                joined.add(copy(st));
                continue;
            }
            RouteLeg into = at > 0 ? legs.get(stops.get(at - 1).getId() + ">" + st.getId()) : null;
            RouteStopKind was = firstLeg != null && firstLeg.getMode() == TransportMode.AIR
                    ? RouteStopKind.AIRPORT_OUT
                    : into != null && into.getMode() == TransportMode.AIR
                            ? RouteStopKind.AIRPORT_IN
                            : RouteStopKind.QUARANTINE;
            joined.add(new StopCopy(st, null, was, st.getPlace(), st.getPlannedAt()));
            for (RouteStop moved : after) joined.add(copy(moved));
        }
        if (transfer != null && firstLeg != null) {
            // The leg out of the transfer is the later trip's leg out of the job's pickup.
            legs.put(transfer.getId() + ">" + after.getFirst().getId(), firstLeg);
        }
        rebuild(draft, joined, legs);
        if (later != null && later.getStatus() == RoutePlanStatus.DRAFT) removeJobStops(next, job);
    }

    private static StopCopy copy(RouteStop st) {
        return new StopCopy(st, st.getJob(), st.getKind(), st.getPlace(), st.getPlannedAt());
    }

    /** The job a stop is for; a stop that names none is the confirming job's. */
    private static TransportJob ownerOf(RouteStop stop, TransportJob job) {
        return stop.getJob() != null ? stop.getJob() : job;
    }

    private TransportJob jobOnTrip(Trip trip, UUID jobId) {
        return jobTrips.jobsOn(trip).stream()
                .filter(j -> j.getId().equals(jobId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Job " + jobId + " is not on trip " + trip.getCode()));
    }

    /** A stop as it is copied into a rebuilt draft. */
    private record StopCopy(RouteStop from, TransportJob job, RouteStopKind kind, Place place, Instant plannedAt) {}

    /**
     * Puts {@code job}'s pickup and delivery on the trip's draft route (US-F3-11): the pickup after the last pickup,
     * the delivery after the last delivery, both without a time until the coordinator plans them. The caller has
     * reopened the route, so a route the trip has is now a draft.
     */
    @Transactional
    public void addJobStops(Trip trip, TransportJob job) {
        Optional<RoutePlan> draft = routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT);
        if (draft.isEmpty()) return;
        List<StopCopy> stops = new ArrayList<>();
        for (RouteStop st : draft.get().getStops()) {
            stops.add(new StopCopy(st, st.getJob(), st.getKind(), st.getPlace(), st.getPlannedAt()));
        }
        TransportRequest request = job.getRequest();
        int lastPickup = -1;
        for (int i = 0; i < stops.size(); i++) if (stops.get(i).kind() == RouteStopKind.PICKUP) lastPickup = i;
        stops.add(lastPickup + 1, new StopCopy(null, job, RouteStopKind.PICKUP, request.getOriginPlace(), null));
        int lastDelivery = stops.size() - 1;
        for (int i = 0; i < stops.size(); i++) if (stops.get(i).kind() == RouteStopKind.DELIVERY) lastDelivery = i;
        stops.add(
                lastDelivery + 1, new StopCopy(null, job, RouteStopKind.DELIVERY, request.getDestinationPlace(), null));
        rebuild(draft.get(), stops);
    }

    /**
     * Puts {@code job}'s own stops, {@code own} (its pickup first, its delivery or transfer last), on the trip's draft
     * route (US-F3-16): the pickup after the last pickup, the rest after the last delivery or transfer.
     */
    private void addJobStops(Trip trip, TransportJob job, List<StopCopy> own) {
        Optional<RoutePlan> draft = routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT);
        if (draft.isEmpty()) return;
        List<StopCopy> stops = new ArrayList<>();
        for (RouteStop st : draft.get().getStops()) stops.add(copy(st));
        int lastPickup = -1;
        for (int i = 0; i < stops.size(); i++) if (stops.get(i).kind() == RouteStopKind.PICKUP) lastPickup = i;
        StopCopy pickup = own.getFirst();
        stops.add(lastPickup + 1, new StopCopy(null, job, RouteStopKind.PICKUP, pickup.place(), pickup.plannedAt()));
        for (StopCopy rest : own.subList(1, own.size())) {
            if (rest.job() == null) continue;
            stops.add(new StopCopy(null, job, rest.kind(), rest.place(), rest.plannedAt()));
        }
        rebuild(draft.get(), stops);
    }

    /** Takes {@code job}'s pickup and delivery off the trip's draft route, joining its neighbours. */
    @Transactional
    public void removeJobStops(Trip trip, TransportJob job) {
        Optional<RoutePlan> draft = routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.DRAFT);
        if (draft.isEmpty()) return;
        List<StopCopy> stops = draft.get().getStops().stream()
                .filter(st -> st.getJob() == null || !st.getJob().getId().equals(job.getId()))
                .map(st -> new StopCopy(st, st.getJob(), st.getKind(), st.getPlace(), st.getPlannedAt()))
                .toList();
        rebuild(draft.get(), stops);
    }

    /**
     * Replaces the draft's stops with {@code stops}, in order. A leg between two stops that were already consecutive
     * keeps its mode, vehicle, distance, time and flight; a new pair gets a road leg for the coordinator to plan.
     */
    private void rebuild(RoutePlan draft, List<StopCopy> stops) {
        rebuild(draft, stops, legsOf(draft));
    }

    /** The plan's legs by the stops they join, {@code from>to}. */
    private static Map<String, RouteLeg> legsOf(RoutePlan plan) {
        Map<String, RouteLeg> legs = new HashMap<>();
        for (RouteLeg leg : plan.getLegs()) {
            legs.put(leg.getFromStop().getId() + ">" + leg.getToStop().getId(), leg);
        }
        return legs;
    }

    /**
     * As above, with the legs to keep looked up in {@code oldLegs}, which may come from another trip's plan when a
     * job's journey is split across trips or joined back (US-F3-16). Only the draft's own legs and flights are
     * replaced; another plan's are copied, never changed.
     */
    private void rebuild(RoutePlan draft, List<StopCopy> stops, Map<String, RouteLeg> oldLegs) {
        Map<UUID, Flight> oldFlights = new HashMap<>();
        for (RouteLeg leg : oldLegs.values()) {
            flightRepository.findByRouteLegId(leg.getId()).ifPresent(f -> oldFlights.put(leg.getId(), f));
        }
        List<Flight> ownFlights = new ArrayList<>();
        for (RouteLeg leg : draft.getLegs()) {
            flightRepository.findByRouteLegId(leg.getId()).ifPresent(ownFlights::add);
        }
        List<RouteLeg> legsToCopy = new ArrayList<>();
        for (int i = 0; i + 1 < stops.size(); i++) {
            RouteStop from = stops.get(i).from();
            RouteStop to = stops.get(i + 1).from();
            legsToCopy.add(from == null || to == null ? null : oldLegs.get(from.getId() + ">" + to.getId()));
        }
        // Detached copies of what stays, before the old rows go.
        List<RouteStop> newStops = new ArrayList<>();
        short seq = 1;
        for (StopCopy c : stops) {
            RouteStop st = new RouteStop();
            st.setRoutePlan(draft);
            st.setSeq(seq++);
            st.setKind(c.kind());
            st.setJob(c.job());
            st.setPlace(c.from() != null ? c.from().getPlace() : c.place());
            st.setBorderCrossing(c.from() != null ? c.from().getBorderCrossing() : null);
            st.setPlannedAt(c.plannedAt());
            // A pickup made from an airport or quarantine stop (US-F3-16) starts once the wait there is over.
            boolean keepsStay =
                    c.from() != null && (c.from().getKind() == c.kind() || c.kind() != RouteStopKind.PICKUP);
            st.setPlannedStayMin(keepsStay ? c.from().getPlannedStayMin() : null);
            st.setDetails(c.from() != null ? c.from().getDetails() : null);
            newStops.add(st);
        }
        record LegCopy(TransportMode mode, Vehicle vehicle, Integer distanceKm, Integer plannedMin, Flight flight) {}
        List<LegCopy> legCopies = new ArrayList<>();
        for (RouteLeg old : legsToCopy) {
            legCopies.add(
                    old == null
                            ? new LegCopy(TransportMode.ROAD, null, null, null, null)
                            : new LegCopy(
                                    old.getMode(),
                                    old.getVehicle(),
                                    old.getDistanceKm(),
                                    old.getPlannedMin(),
                                    oldFlights.get(old.getId())));
        }
        Map<UUID, Flight> keptFlights = new HashMap<>();
        for (LegCopy lc : legCopies) {
            if (lc.flight() != null) {
                Flight copy = new Flight();
                Flight f = lc.flight();
                copy.setAirline(f.getAirline());
                copy.setFlightNo(f.getFlightNo());
                copy.setAircraftType(f.getAircraftType());
                copy.setStallCapacity(f.getStallCapacity());
                FlightService.copyAllocations(f, copy);
                copy.setScheduledDepartureAt(f.getScheduledDepartureAt());
                copy.setScheduledArrivalAt(f.getScheduledArrivalAt());
                copy.setEstimatedDepartureAt(f.getEstimatedDepartureAt());
                copy.setEstimatedArrivalAt(f.getEstimatedArrivalAt());
                keptFlights.put(f.getId(), copy);
            }
        }

        // The old flights go first: a flight still managed while its leg is deleted fails the flush.
        flightRepository.deleteAll(ownFlights);
        routeLegRepository.deleteAll(draft.getLegs());
        draft.getLegs().clear();
        routeStopRepository.deleteAll(draft.getStops());
        draft.getStops().clear();
        routeStopRepository.flush();

        for (RouteStop st : newStops) {
            draft.getStops().add(routeStopRepository.save(st));
        }
        for (int i = 0; i < legCopies.size(); i++) {
            LegCopy lc = legCopies.get(i);
            RouteLeg leg = new RouteLeg();
            leg.setRoutePlan(draft);
            leg.setSeq((short) (i + 1));
            leg.setFromStop(draft.getStops().get(i));
            leg.setToStop(draft.getStops().get(i + 1));
            leg.setMode(lc.mode());
            leg.setVehicle(lc.mode() == TransportMode.ROAD ? lc.vehicle() : null);
            leg.setDistanceKm(lc.distanceKm());
            leg.setPlannedMin(lc.plannedMin());
            RouteLeg saved = routeLegRepository.save(leg);
            if (lc.flight() != null) {
                Flight flight = keptFlights.get(lc.flight().getId());
                flight.setRouteLeg(saved);
                flightRepository.save(flight);
            }
            draft.getLegs().add(saved);
        }
    }

    public RoutePlanResponse toResponse(RoutePlan plan, UUID jobId) {
        Map<UUID, Flight> flightsByLegId = new HashMap<>();
        for (RouteLeg leg : plan.getLegs()) {
            flightRepository.findByRouteLegId(leg.getId()).ifPresent(f -> flightsByLegId.put(leg.getId(), f));
        }
        return JobMapper.toRoutePlanResponse(plan, jobId, flightsByLegId);
    }
}
