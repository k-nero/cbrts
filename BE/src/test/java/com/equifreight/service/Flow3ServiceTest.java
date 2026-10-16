package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
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
    private AuditLogRepository auditLogRepository;

    private VehicleService vehicleService;
    private LoadPlanService loadPlanService;
    private RoutePlanService routePlanService;
    private CrewAssignmentService crewAssignmentService;

    @BeforeEach
    void setUp() {
        vehicleService = new VehicleService(vehicleRepository, vehicleStallRepository, vehicleBookingRepository, transportJobRepository);
        loadPlanService = new LoadPlanService(loadPlanRepository, loadPlanStallRepository, transportJobRepository, vehicleRepository, vehicleStallRepository, horseRepository, auditLogRepository);
        routePlanService = new RoutePlanService(routePlanRepository, routeStopRepository, routeLegRepository, flightRepository, transportJobRepository, placeRepository, borderCrossingRepository, vehicleRepository, auditLogRepository);
        crewAssignmentService = new CrewAssignmentService(crewAssignmentRepository, transportJobRepository, userRepository, auditLogRepository);
    }

    @Test
    @DisplayName("Vehicle booking refuses double booking when time ranges overlap")
    void vehicleBooking_refusesOverlappingBooking() {
        UUID vehicleId = UUID.randomUUID();
        Vehicle vehicle = new Vehicle();
        vehicle.setCode("TX-447");
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
        req.setKind("JOB");

        assertThrows(ConflictException.class, () -> vehicleService.bookVehicle(req));
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
}
