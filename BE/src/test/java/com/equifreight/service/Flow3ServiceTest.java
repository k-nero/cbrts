package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.model.clearance.ClearanceStatusResponse;
import com.equifreight.model.fleet.VehicleBookingRequest;
import com.equifreight.model.job.AssignCrewRequest;
import com.equifreight.model.job.LoadPlanConflictResponse;
import com.equifreight.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Flow3ServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private VehicleStallRepository vehicleStallRepository;
    @Mock
    private VehicleBookingRepository vehicleBookingRepository;
    @Mock
    private TransportJobRepository transportJobRepository;
    @Mock
    private LoadPlanRepository loadPlanRepository;
    @Mock
    private LoadPlanStallRepository loadPlanStallRepository;
    @Mock
    private HorseRepository horseRepository;
    @Mock
    private RoutePlanRepository routePlanRepository;
    @Mock
    private RouteStopRepository routeStopRepository;
    @Mock
    private RouteLegRepository routeLegRepository;
    @Mock
    private FlightRepository flightRepository;
    @Mock
    private PlaceRepository placeRepository;
    @Mock
    private BorderCrossingRepository borderCrossingRepository;
    @Mock
    private CrewAssignmentRepository crewAssignmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ClearanceService clearanceService;
    @Mock
    private AuditService auditService;
    @Mock
    private TransportRequestRepository transportRequestRepository;

    private VehicleService vehicleService;
    private LoadPlanService loadPlanService;
    private RoutePlanService routePlanService;
    private CrewAssignmentService crewAssignmentService;
    private TransportJobService transportJobService;

    @BeforeEach
    void setUp() {
        vehicleService = new VehicleService(vehicleRepository, vehicleStallRepository, vehicleBookingRepository, transportJobRepository);
        loadPlanService = new LoadPlanService(loadPlanRepository, loadPlanStallRepository, transportJobRepository, vehicleRepository, vehicleStallRepository, horseRepository, vehicleBookingRepository, auditService);
        routePlanService = new RoutePlanService(routePlanRepository, routeStopRepository, routeLegRepository, flightRepository, transportJobRepository, placeRepository, borderCrossingRepository, vehicleRepository, clearanceService, auditService);
        crewAssignmentService = new CrewAssignmentService(crewAssignmentRepository, transportJobRepository, userRepository, auditService);
        transportJobService = new TransportJobService(transportJobRepository, loadPlanService, routePlanService, crewAssignmentService, loadPlanRepository, routePlanRepository, crewAssignmentRepository, clearanceService, auditService);
    }

    @Test
    @DisplayName("Vehicle booking refuses double booking when time ranges overlap")
    void vehicleBooking_refusesOverlappingBooking() {
        UUID vehicleId = UUID.randomUUID();
        Vehicle vehicle = new Vehicle();
        vehicle.setCode("TX-447");
        vehicle.setStatus(VehicleStatus.ACTIVE);
        when(vehicleRepository.findById(vehicleId)).thenReturn(Optional.of(vehicle));

        Instant start = Instant.parse("2026-10-18T06:00:00Z");
        Instant end = Instant.parse("2026-10-18T14:00:00Z");

        VehicleBooking existing = new VehicleBooking();
        existing.setStartsAt(start);
        existing.setEndsAt(end);
        when(vehicleBookingRepository.findOverlappingBookings(eq(vehicle.getId()), eq(start), eq(end), isNull()))
                .thenReturn(List.of(existing));

        VehicleBookingRequest req = new VehicleBookingRequest();
        req.setVehicleId(vehicleId);
        req.setStartsAt(start);
        req.setEndsAt(end);
        req.setKind(BookingKind.MAINTENANCE);

        assertThrows(ConflictException.class, () -> vehicleService.bookVehicle(req));
    }

    @Test
    @DisplayName("Vehicle booking refuses when vehicle is under maintenance (US-F3-02)")
    void vehicleBooking_refusesMaintenanceVehicle() {
        UUID vehicleId = UUID.randomUUID();
        Vehicle vehicle = new Vehicle();
        vehicle.setCode("TX-447");
        vehicle.setStatus(VehicleStatus.MAINTENANCE);
        when(vehicleRepository.findById(vehicleId)).thenReturn(Optional.of(vehicle));

        VehicleBookingRequest req = new VehicleBookingRequest();
        req.setVehicleId(vehicleId);
        req.setStartsAt(Instant.parse("2026-10-18T06:00:00Z"));
        req.setEndsAt(Instant.parse("2026-10-18T14:00:00Z"));
        req.setKind(BookingKind.MAINTENANCE);

        assertThrows(BusinessException.class, () -> vehicleService.bookVehicle(req));
    }

    @Test
    @DisplayName("Vehicle booking refuses mismatched booking kind and job id (US-F3-02)")
    void vehicleBooking_refusesMismatchedBookingKind() {
        UUID vehicleId = UUID.randomUUID();
        Vehicle vehicle = new Vehicle();
        vehicle.setCode("TX-447");
        vehicle.setStatus(VehicleStatus.ACTIVE);
        when(vehicleRepository.findById(vehicleId)).thenReturn(Optional.of(vehicle));

        // kind = JOB but jobId = null
        VehicleBookingRequest req = new VehicleBookingRequest();
        req.setVehicleId(vehicleId);
        req.setStartsAt(Instant.parse("2026-10-18T06:00:00Z"));
        req.setEndsAt(Instant.parse("2026-10-18T14:00:00Z"));
        req.setKind(BookingKind.JOB);
        req.setJobId(null);

        assertThrows(BusinessException.class, () -> vehicleService.bookVehicle(req));
    }

    @Test
    @DisplayName("Load plan evaluates conflicts when stallion stands beside a mare")
    void loadPlan_detectsStallionBesideMareConflict() {
        Vehicle vehicle = new Vehicle();
        vehicle.setPayloadKg(3200);

        LoadPlan plan = new LoadPlan();
        plan.setVehicle(vehicle);

        VehicleStall stall1 = new VehicleStall();
        stall1.setPositionNo((short) 1);
        stall1.setRowNo((short) 1);
        stall1.setStallType(StallType.BOX);

        VehicleStall stall2 = new VehicleStall();
        stall2.setPositionNo((short) 2);
        stall2.setRowNo((short) 1);
        stall2.setStallType(StallType.STANDARD);

        Horse stallion = new Horse();
        stallion.setName("Copper King");
        stallion.setSex(HorseSex.STALLION);
        stallion.setWeightKg((short) 580);
        stallion.setRequiredStall(StallType.BOX);

        Horse mare = new Horse();
        mare.setName("Nightfall");
        mare.setSex(HorseSex.MARE);
        mare.setWeightKg((short) 480);
        mare.setRequiredStall(StallType.STANDARD);

        LoadPlanStall s1 = new LoadPlanStall();
        s1.setVehicleStall(stall1);
        s1.setHorse(stallion);

        LoadPlanStall s2 = new LoadPlanStall();
        s2.setVehicleStall(stall2);
        s2.setHorse(mare);

        List<LoadPlanConflictResponse> conflicts = loadPlanService.evaluateConflicts(
                plan, List.of(s1, s2), List.of(stallion, mare));

        assertFalse(conflicts.isEmpty());
        assertTrue(conflicts.stream().anyMatch(c -> c.getRule().equals("STALLION_NEAR_MARE")));
    }

    @Test
    @DisplayName("Load plan detects conflict when nervous horse is near ramp")
    void loadPlan_detectsNervousHorseNearRamp() {
        Vehicle vehicle = new Vehicle();
        vehicle.setPayloadKg(3200);

        LoadPlan plan = new LoadPlan();
        plan.setVehicle(vehicle);

        VehicleStall rampStall = new VehicleStall();
        rampStall.setPositionNo((short) 5);
        rampStall.setRowNo((short) 3);
        rampStall.setNearRamp(true);
        rampStall.setStallType(StallType.STANDARD);

        Horse nervousHorse = new Horse();
        nervousHorse.setName("Nightfall");
        nervousHorse.setSex(HorseSex.MARE);
        nervousHorse.setTemperament(Temperament.NERVOUS);
        nervousHorse.setRequiredStall(StallType.STANDARD);

        LoadPlanStall s1 = new LoadPlanStall();
        s1.setVehicleStall(rampStall);
        s1.setHorse(nervousHorse);

        List<LoadPlanConflictResponse> conflicts = loadPlanService.evaluateConflicts(
                plan, List.of(s1), List.of(nervousHorse));

        assertFalse(conflicts.isEmpty());
        assertTrue(conflicts.stream().anyMatch(c -> c.getRule().equals("NERVOUS_NEAR_RAMP")));
    }

    @Test
    @DisplayName("Crew assignment refuses when groom count is below required 1 per 3 horses")
    void crewAssignment_refusesInsufficientGrooms() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = new TransportJob();
        job.setCode("CBRT-2026-041");

        TransportRequest req = new TransportRequest();
        List<RequestHorse> horses = new ArrayList<>();
        for (int i = 0; i < 4; i++) { // 4 horses -> ceil(4/3) = 2 grooms required
            horses.add(new RequestHorse());
        }
        req.setHorses(horses);
        job.setRequest(req);

        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        AssignCrewRequest crewReq = new AssignCrewRequest();
        AssignCrewRequest.CrewItem driver = new AssignCrewRequest.CrewItem();
        driver.setUserId(UUID.randomUUID());
        driver.setCrewRole(CrewRole.DRIVER);

        AssignCrewRequest.CrewItem groom = new AssignCrewRequest.CrewItem();
        groom.setUserId(UUID.randomUUID());
        groom.setCrewRole(CrewRole.GROOM); // only 1 groom, needs 2

        crewReq.setCrew(List.of(driver, groom));

        User user = new User();
        user.setEmail("khoi.do@equifreight.vn");

        assertThrows(BusinessException.class, () -> crewAssignmentService.assignCrew(jobId, crewReq, user));
    }

    @Test
    @DisplayName("Route confirmation refuses delivery time after arrival window close")
    void routePlan_refusesDeliveryAfterArrivalWindow() {
        UUID jobId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();

        TransportJob job = new TransportJob();
        job.setId(jobId);
        job.setCode("CBRT-2026-041");
        job.setWindowEnd(Instant.parse("2026-10-18T14:00:00Z"));

        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        RoutePlan plan = new RoutePlan();
        plan.setJob(job);
        plan.setVersionNo((short) 1);

        RouteStop s1 = new RouteStop();
        s1.setKind(RouteStopKind.PICKUP);
        s1.setPlannedAt(Instant.parse("2026-10-18T06:00:00Z"));

        RouteStop s2 = new RouteStop();
        s2.setKind(RouteStopKind.DELIVERY);
        s2.setPlannedAt(Instant.parse("2026-10-18T15:00:00Z")); // after window close 14:00!

        plan.getStops().add(s1);
        plan.getStops().add(s2);

        when(routePlanRepository.findById(planId)).thenReturn(Optional.of(plan));

        User user = new User();
        user.setEmail("khoi.do@equifreight.vn");

        assertThrows(BusinessException.class, () -> routePlanService.confirmRoutePlan(jobId, planId, "Test", user));
    }

    @Test
    @DisplayName("Load plan assignStall refuses horse that does not belong to the job (US-F3-05)")
    void loadPlan_assignStall_refusesHorseNotOnJob() {
        UUID jobId = UUID.randomUUID();
        UUID stallId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();

        Vehicle vehicle = new Vehicle();
        vehicle.setId(vehicleId);

        VehicleStall stall = new VehicleStall();
        stall.setId(stallId);
        stall.setVehicle(vehicle);

        TransportJob job = new TransportJob();
        job.setId(jobId);
        TransportRequest req = new TransportRequest();
        req.setHorses(new ArrayList<>()); // empty, horseId is not here
        job.setRequest(req);

        LoadPlan plan = new LoadPlan();
        plan.setId(UUID.randomUUID());
        plan.setJob(job);
        plan.setVehicle(vehicle);
        plan.setStatus(LoadPlanStatus.DRAFT);

        when(loadPlanRepository.findFirstByJobIdOrderByCreatedAtDesc(jobId)).thenReturn(Optional.of(plan));
        when(vehicleStallRepository.findById(stallId)).thenReturn(Optional.of(stall));

        assertThrows(ResourceNotFoundException.class, () -> loadPlanService.assignStall(jobId, stallId, horseId));
    }

    @Test
    @DisplayName("Crew assignment refuses crew member without ESCORT role (US-F3-06)")
    void crewAssignment_refusesNonEscortRole() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = new TransportJob();
        job.setCode("CBRT-2026-041");
        TransportRequest req = new TransportRequest();
        req.setHorses(List.of(new RequestHorse()));
        job.setRequest(req);

        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        UUID groomId = UUID.randomUUID();
        User groomUser = new User();
        groomUser.setId(groomId);
        Role escortRole = new Role();
        escortRole.setName(RoleName.ESCORT);
        groomUser.setRoles(Set.of(escortRole));

        UUID driverId = UUID.randomUUID();
        User driverUser = new User();
        driverUser.setId(driverId);
        Role lmRole = new Role();
        lmRole.setName(RoleName.LOGISTICS_MANAGER);
        driverUser.setRoles(Set.of(lmRole)); // Not ESCORT!

        when(userRepository.findById(groomId)).thenReturn(Optional.of(groomUser));
        when(userRepository.findById(driverId)).thenReturn(Optional.of(driverUser));

        AssignCrewRequest crewReq = new AssignCrewRequest();
        AssignCrewRequest.CrewItem groomItem = new AssignCrewRequest.CrewItem();
        groomItem.setUserId(groomId);
        groomItem.setCrewRole(CrewRole.GROOM);

        AssignCrewRequest.CrewItem driverItem = new AssignCrewRequest.CrewItem();
        driverItem.setUserId(driverId);
        driverItem.setCrewRole(CrewRole.DRIVER);

        crewReq.setCrew(List.of(groomItem, driverItem));

        User actor = new User();
        actor.setEmail("khoi.do@equifreight.vn");

        assertThrows(BusinessException.class, () -> crewAssignmentService.assignCrew(jobId, crewReq, actor));
    }

    @Test
    @DisplayName("Crew assignment refuses duplicate user in same trip crew (US-F3-06)")
    void crewAssignment_refusesDuplicateUser() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = new TransportJob();
        job.setCode("CBRT-2026-041");
        TransportRequest req = new TransportRequest();
        req.setHorses(List.of(new RequestHorse()));
        job.setRequest(req);

        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        UUID escortId = UUID.randomUUID();

        AssignCrewRequest crewReq = new AssignCrewRequest();
        AssignCrewRequest.CrewItem item1 = new AssignCrewRequest.CrewItem();
        item1.setUserId(escortId);
        item1.setCrewRole(CrewRole.DRIVER);
        AssignCrewRequest.CrewItem item2 = new AssignCrewRequest.CrewItem();
        item2.setUserId(escortId); // duplicate!
        item2.setCrewRole(CrewRole.GROOM);
        crewReq.setCrew(List.of(item1, item2));

        User actor = new User();
        actor.setEmail("khoi.do@equifreight.vn");

        assertThrows(BusinessException.class, () -> crewAssignmentService.assignCrew(jobId, crewReq, actor));
    }

    @Test
    @DisplayName("Crew assignment refuses crew member with overlapping job (US-F3-06)")
    void crewAssignment_refusesOverlappingTrip() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = new TransportJob();
        job.setId(jobId);
        job.setCode("CBRT-2026-041");
        job.setPlannedDepartureAt(Instant.parse("2026-10-18T06:00:00Z"));
        job.setPlannedArrivalAt(Instant.parse("2026-10-18T14:00:00Z"));
        TransportRequest req = new TransportRequest();
        req.setHorses(List.of(new RequestHorse()));
        job.setRequest(req);

        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        UUID driverId = UUID.randomUUID();
        User driverUser = new User();
        driverUser.setId(driverId);
        driverUser.setFirstName("Văn Minh");
        driverUser.setLastName("Trần");
        Role escortRole = new Role();
        escortRole.setName(RoleName.ESCORT);
        driverUser.setRoles(Set.of(escortRole));

        when(userRepository.findById(driverId)).thenReturn(Optional.of(driverUser));

        CrewAssignment overlapping = new CrewAssignment();
        TransportJob otherJob = new TransportJob();
        otherJob.setCode("CBRT-2026-042");
        overlapping.setJob(otherJob);

        when(crewAssignmentRepository.findOverlappingAssignments(eq(driverId), eq(jobId), any(), any()))
                .thenReturn(List.of(overlapping));

        AssignCrewRequest crewReq = new AssignCrewRequest();
        AssignCrewRequest.CrewItem driverItem = new AssignCrewRequest.CrewItem();
        driverItem.setUserId(driverId);
        driverItem.setCrewRole(CrewRole.DRIVER);

        AssignCrewRequest.CrewItem groomItem = new AssignCrewRequest.CrewItem();
        groomItem.setUserId(UUID.randomUUID());
        groomItem.setCrewRole(CrewRole.GROOM);

        crewReq.setCrew(List.of(driverItem, groomItem));

        User actor = new User();
        actor.setEmail("khoi.do@equifreight.vn");

        assertThrows(ConflictException.class, () -> crewAssignmentService.assignCrew(jobId, crewReq, actor));
    }

    @Test
    @DisplayName("Sign-off refuses non-LOGISTICS_MANAGER user (US-F3-08)")
    void signOff_refusesNonLogisticsManager() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = new TransportJob();
        job.setId(jobId);
        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        User coordinator = new User();
        coordinator.setEmail("khoi.do@equifreight.vn");
        Role role = new Role();
        role.setName(RoleName.FLEET_COORDINATOR); // Not LOGISTICS_MANAGER!
        coordinator.setRoles(Set.of(role));

        assertThrows(UnauthorizedException.class, () -> transportJobService.signOffTripPlan(jobId, coordinator));
    }

    @Test
    @DisplayName("Sign-off refuses when clearance gate is LOCKED (US-F3-08)")
    void signOff_refusesWhenClearanceGateLocked() {
        UUID jobId = UUID.randomUUID();
        User manager = new User();
        manager.setEmail("yen.vu@equifreight.vn");
        Role role = new Role();
        role.setName(RoleName.LOGISTICS_MANAGER);
        manager.setRoles(Set.of(role));

        TransportJob job = new TransportJob();
        job.setId(jobId);
        job.setCode("CBRT-2026-041");
        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        ClearanceStatusResponse gate = new ClearanceStatusResponse();
        gate.setClearanceReady(false);
        gate.setOutstandingIssues(List.of("4 items outstanding"));
        when(clearanceService.getClearanceStatus(jobId)).thenReturn(gate);

        assertThrows(BusinessException.class, () -> transportJobService.signOffTripPlan(jobId, manager));
    }

    @Test
    @DisplayName("Route confirmation rechecks documents and resets sign-off (US-F3-03)")
    void routePlan_confirm_rechecksDocumentsAndResetsSignOff() {
        UUID jobId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();

        TransportJob job = new TransportJob();
        job.setId(jobId);
        job.setCode("CBRT-2026-041");
        job.setSignedOffAt(Instant.now());

        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        RoutePlan plan = new RoutePlan();
        plan.setJob(job);
        plan.setVersionNo((short) 1);

        RouteStop s1 = new RouteStop();
        s1.setKind(RouteStopKind.PICKUP);
        s1.setPlannedAt(Instant.parse("2026-10-18T06:00:00Z"));

        RouteStop s2 = new RouteStop();
        s2.setKind(RouteStopKind.DELIVERY);
        s2.setPlannedAt(Instant.parse("2026-10-18T12:00:00Z"));

        plan.getStops().add(s1);
        plan.getStops().add(s2);

        when(routePlanRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(routePlanRepository.save(any(RoutePlan.class))).thenAnswer(inv -> inv.getArgument(0));

        User user = new User();
        user.setEmail("khoi.do@equifreight.vn");

        routePlanService.confirmRoutePlan(jobId, planId, "Confirmed", user);

        assertNull(job.getSignedOffAt());
        verify(clearanceService).recheckJobDocuments(jobId);
    }
}
