package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.ClearanceStatusResponse;
import com.equifreight.model.fleet.VehicleBookingRequest;
import com.equifreight.model.fleet.VehicleBookingResponse;
import com.equifreight.model.job.AssignCrewRequest;
import com.equifreight.model.job.JobDetailResponse;
import com.equifreight.model.job.LoadPlanConflictResponse;
import com.equifreight.model.job.MoveHorseRequest;
import com.equifreight.repository.*;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class Flow3ServiceTest {

    @Mock
    private FlightService flightService;

    @Mock
    private TripNotices tripNotices;

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
    private NotificationService notificationService;

    @Mock
    private TransportRequestRepository transportRequestRepository;

    @Mock
    private JobTripService jobTrips;

    private final com.equifreight.repository.FlightRepository flights =
            mock(com.equifreight.repository.FlightRepository.class);

    /** The trip every job in these tests travels on alone. */
    private final Trip trip = trip();

    private VehicleService vehicleService;
    private final VehicleAvailability availability = mock(VehicleAvailability.class);
    private LoadPlanService loadPlanService;
    private RoutePlanService routePlanService;
    private CrewAssignmentService crewAssignmentService;
    private TransportJobService transportJobService;

    private static Trip trip() {
        Trip trip = new Trip();
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-2026-001");
        return trip;
    }

    /** Puts {@code plan} on {@code vehicle} as a vehicle of {@code trip}. */
    private static TripVehicle onVehicle(LoadPlan plan, Trip trip, Vehicle vehicle) {
        TripVehicle tripVehicle = new TripVehicle();
        tripVehicle.setId(UUID.randomUUID());
        tripVehicle.setTrip(trip);
        tripVehicle.setVehicle(vehicle);
        tripVehicle.setSeq((short) 1);
        plan.setTripVehicle(tripVehicle);
        return tripVehicle;
    }

    /** A draft plan for the trip's vehicle, TX-447, which the trip lookup returns. */
    private LoadPlan loadPlan(TransportJob job) {
        Vehicle vehicle = new Vehicle();
        vehicle.setId(UUID.randomUUID());
        vehicle.setCode("TX-447");
        vehicle.setStatus(VehicleStatus.ACTIVE);
        vehicle.setPayloadKg(5504);
        LoadPlan plan = new LoadPlan();
        plan.setId(UUID.randomUUID());
        TripVehicle tripVehicle = onVehicle(plan, trip, vehicle);
        plan.setStatus(LoadPlanStatus.DRAFT);
        lenient().when(jobTrips.vehicleOf(trip)).thenReturn(Optional.of(tripVehicle));
        lenient().when(jobTrips.vehiclesOf(trip)).thenReturn(List.of(tripVehicle));
        lenient().when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        onTrip(job, plan);
        return plan;
    }

    /** The job's horses are on the trip, and {@code plan} is the trip's only trailer. */
    private void onTrip(TransportJob job, LoadPlan plan) {
        lenient().when(jobTrips.horsesOn(trip)).thenAnswer(i -> horsesOnTrip(job));
        lenient().when(loadPlanRepository.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(plan));
        lenient()
                .when(loadPlanRepository.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of(plan));
    }

    private static List<TripHorse> horsesOnTrip(TransportJob job) {
        if (job.getRequest() == null || job.getRequest().getHorses() == null) return List.of();
        return job.getRequest().getHorses().stream()
                .map(rh -> {
                    TripHorse th = new TripHorse();
                    th.setJob(job);
                    th.setHorse(rh.getHorse());
                    return th;
                })
                .toList();
    }

    private CrewAssignment assignment(User user, CrewRole role) {
        CrewAssignment ca = new CrewAssignment();
        ca.setTripVehicle(jobTrips.vehicleOf(trip).orElse(null));
        ca.setUser(user);
        ca.setCrewRole(role);
        return ca;
    }

    private static AssignCrewRequest crew(User a, CrewRole roleA, User b, CrewRole roleB) {
        AssignCrewRequest.CrewItem first = AssignCrewRequest.CrewItem.builder()
                .userId(a.getId())
                .crewRole(roleA)
                .build();
        AssignCrewRequest.CrewItem second = AssignCrewRequest.CrewItem.builder()
                .userId(b.getId())
                .crewRole(roleB)
                .build();
        AssignCrewRequest request =
                AssignCrewRequest.builder().crew(List.of(first, second)).build();
        return request;
    }

    private static User user(String email, String roleName) {
        Role role = new Role();
        role.setName(roleName);
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setFirstName(email.substring(0, email.indexOf('.')));
        user.setLastName("Test");
        user.setRoles(Set.of(role));
        return user;
    }

    @BeforeEach
    void setUp() {
        lenient().when(jobTrips.findTripOf(any())).thenReturn(Optional.of(trip));
        lenient().when(jobTrips.findTripOf(any(), isNull())).thenReturn(Optional.of(trip));
        lenient().when(jobTrips.tripOf(any())).thenReturn(trip);
        lenient().when(jobTrips.tripOf(any(), isNull())).thenReturn(trip);
        // The vehicle the load plan chose, which the crew travels with; tests with a load plan replace it.
        TripVehicle chosen = new TripVehicle();
        chosen.setId(UUID.randomUUID());
        chosen.setTrip(trip);
        Vehicle chosenVehicle = new Vehicle();
        chosenVehicle.setCode("TX-447");
        chosen.setVehicle(chosenVehicle);
        lenient().when(jobTrips.vehicleOf(trip)).thenReturn(Optional.of(chosen));
        lenient().when(jobTrips.vehiclesOf(trip)).thenReturn(List.of(chosen));
        // US-F7-01's checks have their own tests (VehicleAvailabilityTest); here every vehicle may run the trip.
        lenient()
                .when(availability.firstAvailable(any(), any()))
                .thenAnswer(i -> i.<List<Vehicle>>getArgument(0).getFirst());
        vehicleService = new VehicleService(
                vehicleRepository,
                vehicleStallRepository,
                vehicleBookingRepository,
                transportJobRepository,
                jobTrips,
                mock(CountryRepository.class),
                mock(CorridorRepository.class),
                mock(TripVehicleRepository.class),
                availability,
                auditService,
                mock(PlaceRepository.class));
        routePlanService = new RoutePlanService(
                routePlanRepository,
                routeStopRepository,
                routeLegRepository,
                flightRepository,
                transportJobRepository,
                placeRepository,
                borderCrossingRepository,
                vehicleRepository,
                clearanceService,
                jobTrips,
                auditService,
                tripNotices,
                PlanningStub.planningDefaults());
        loadPlanService = new LoadPlanService(
                loadPlanRepository,
                loadPlanStallRepository,
                transportJobRepository,
                vehicleRepository,
                vehicleStallRepository,
                vehicleBookingRepository,
                crewAssignmentRepository,
                jobTrips,
                routePlanService,
                mock(BiosecurityService.class),
                auditService,
                availability,
                mock(RequestFleetService.class));
        crewAssignmentService = new CrewAssignmentService(
                crewAssignmentRepository,
                transportJobRepository,
                userRepository,
                jobTrips,
                loadPlanRepository,
                loadPlanStallRepository,
                auditService,
                flightService,
                routePlanRepository);
        transportJobService = new TransportJobService(
                transportJobRepository,
                loadPlanService,
                routePlanService,
                crewAssignmentService,
                loadPlanRepository,
                routePlanRepository,
                crewAssignmentRepository,
                clearanceService,
                auditService,
                notificationService,
                mock(CodeService.class),
                jobTrips,
                mock(JourneyService.class),
                flights);
    }

    @Test
    @DisplayName("A job not planned yet has no route plan, and reading it doesn't throw")
    void aJobWithoutARoutePlanHasNone() {
        UUID jobId = UUID.randomUUID();
        when(routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.empty());
        when(routePlanRepository.findFirstByTrip_IdOrderByVersionNoDesc(trip.getId()))
                .thenReturn(Optional.empty());

        assertThat(routePlanService.findActiveRoutePlan(jobId)).isEmpty();
        // The endpoint still answers 404 for it.
        assertThrows(ResourceNotFoundException.class, () -> routePlanService.getActiveRoutePlan(jobId));
    }

    @Test
    @DisplayName("The confirmed route plan wins over a later draft")
    void theConfirmedRoutePlanWins() {
        UUID jobId = UUID.randomUUID();
        RoutePlan confirmed = new RoutePlan();
        confirmed.setId(UUID.randomUUID());
        confirmed.setStatus(RoutePlanStatus.CONFIRMED);
        TransportJob job = new TransportJob();
        job.setId(jobId);
        confirmed.setTrip(trip);
        when(routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(confirmed));

        assertThat(routePlanService.findActiveRoutePlan(jobId))
                .get()
                .extracting(r -> r.id())
                .isEqualTo(confirmed.getId());
        verify(routePlanRepository, never()).findFirstByTrip_IdOrderByVersionNoDesc(trip.getId());
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

        VehicleBookingRequest req = VehicleBookingRequest.builder()
                .vehicleId(vehicleId)
                .startsAt(start)
                .endsAt(end)
                .kind(BookingKind.MAINTENANCE)
                .build();

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

        VehicleBookingRequest req = VehicleBookingRequest.builder()
                .vehicleId(vehicleId)
                .startsAt(Instant.parse("2026-10-18T06:00:00Z"))
                .endsAt(Instant.parse("2026-10-18T14:00:00Z"))
                .kind(BookingKind.MAINTENANCE)
                .build();

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
        VehicleBookingRequest req = VehicleBookingRequest.builder()
                .vehicleId(vehicleId)
                .startsAt(Instant.parse("2026-10-18T06:00:00Z"))
                .endsAt(Instant.parse("2026-10-18T14:00:00Z"))
                .kind(BookingKind.JOB)
                .jobId(null)
                .build();

        assertThrows(BusinessException.class, () -> vehicleService.bookVehicle(req));
    }

    @Test
    @DisplayName("Load plan evaluates conflicts when stallion stands beside a mare")
    void loadPlan_detectsStallionBesideMareConflict() {
        Vehicle vehicle = new Vehicle();
        vehicle.setPayloadKg(3200);

        LoadPlan plan = new LoadPlan();
        onVehicle(plan, trip, vehicle);

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

        List<LoadPlanConflictResponse> conflicts =
                loadPlanService.evaluateConflicts(plan, new HashSet<>(), List.of(s1, s2));

        assertFalse(conflicts.isEmpty());
        assertTrue(conflicts.stream().anyMatch(c -> c.rule().equals("STALLION_NEAR_MARE")));
    }

    @Test
    @DisplayName("Load plan detects conflict when nervous horse is near ramp")
    void loadPlan_detectsNervousHorseNearRamp() {
        Vehicle vehicle = new Vehicle();
        vehicle.setPayloadKg(3200);

        LoadPlan plan = new LoadPlan();
        onVehicle(plan, trip, vehicle);

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

        List<LoadPlanConflictResponse> conflicts =
                loadPlanService.evaluateConflicts(plan, new HashSet<>(), List.of(s1));

        assertFalse(conflicts.isEmpty());
        assertTrue(conflicts.stream().anyMatch(c -> c.rule().equals("NERVOUS_NEAR_RAMP")));
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
        // The trip's only trailer carries all four.
        when(jobTrips.horsesOn(trip))
                .thenReturn(List.of(new TripHorse(), new TripHorse(), new TripHorse(), new TripHorse()));

        AssignCrewRequest.CrewItem driver = AssignCrewRequest.CrewItem.builder()
                .userId(UUID.randomUUID())
                .crewRole(CrewRole.DRIVER)
                .build();

        AssignCrewRequest.CrewItem groom = AssignCrewRequest.CrewItem.builder()
                .userId(UUID.randomUUID())
                .crewRole(CrewRole.GROOM) // only 1 groom, needs 2
                .build();

        AssignCrewRequest crewReq =
                AssignCrewRequest.builder().crew(List.of(driver, groom)).build();

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
        plan.setTrip(trip);
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
        onVehicle(plan, trip, vehicle);
        plan.setStatus(LoadPlanStatus.DRAFT);

        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(loadPlanRepository.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(plan));
        when(vehicleStallRepository.findById(stallId)).thenReturn(Optional.of(stall));

        assertThrows(ResourceNotFoundException.class, () -> loadPlanService.assignStall(jobId, stallId, horseId));
    }

    @Test
    @DisplayName("A confirmed load plan's vehicle can't be swapped (US-F3-09)")
    void loadPlan_confirmedVehicleCannotBeSwapped() {
        TransportJob job = readyJob();
        LoadPlan plan = loadPlan(job);
        plan.setStatus(LoadPlanStatus.CONFIRMED);
        when(loadPlanRepository.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(plan));
        Vehicle other = new Vehicle();
        other.setId(UUID.randomUUID());
        other.setStatus(VehicleStatus.ACTIVE);
        when(vehicleRepository.findById(other.getId())).thenReturn(Optional.of(other));

        assertThrows(BusinessException.class, () -> loadPlanService.createLoadPlan(job.getId(), other.getId()));
        verify(jobTrips, never()).useVehicle(any(), any());
    }

    @Test
    @DisplayName("Swapping a draft plan's vehicle clears its placements and keeps the trip's vehicle and crew")
    void loadPlan_draftVehicleSwapKeepsTheTripVehicle() {
        TransportJob job = readyJob();
        LoadPlan plan = loadPlan(job);
        when(loadPlanRepository.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(plan));
        Vehicle other = new Vehicle();
        other.setId(UUID.randomUUID());
        other.setStatus(VehicleStatus.ACTIVE);
        other.setPayloadKg(5504);
        when(vehicleRepository.findById(other.getId())).thenReturn(Optional.of(other));
        loadPlanService.createLoadPlan(job.getId(), other.getId());

        verify(loadPlanStallRepository).deleteAllForLoadPlan(plan.getId());
        verify(loadPlanRepository, never()).save(any());
        assertThat(plan.getVehicle()).isSameAs(other);
    }

    @Test
    @DisplayName("The crew is assigned to a vehicle, so the load plan names it first (US-F3-09)")
    void crewAssignment_needsTheTripsVehicle() {
        TransportJob job = readyJob();
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(jobTrips.vehiclesOf(trip)).thenReturn(List.of());
        User driver = user("minh.tran@equifreight.vn", RoleName.ESCORT);
        User groom = user("hoa.le@equifreight.vn", RoleName.ESCORT);

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> crewAssignmentService.assignCrew(
                        job.getId(), crew(driver, CrewRole.DRIVER, groom, CrewRole.GROOM), user("khoi.do", "x")));
        assertThat(ex.getMessage()).contains("Load plan");
        verify(crewAssignmentRepository, never()).saveAll(any());
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

        AssignCrewRequest.CrewItem groomItem = AssignCrewRequest.CrewItem.builder()
                .userId(groomId)
                .crewRole(CrewRole.GROOM)
                .build();

        AssignCrewRequest.CrewItem driverItem = AssignCrewRequest.CrewItem.builder()
                .userId(driverId)
                .crewRole(CrewRole.DRIVER)
                .build();

        AssignCrewRequest crewReq =
                AssignCrewRequest.builder().crew(List.of(groomItem, driverItem)).build();

        User actor = new User();
        actor.setEmail("khoi.do@equifreight.vn");

        assertThrows(BusinessException.class, () -> crewAssignmentService.assignCrew(jobId, crewReq, actor));
    }

    // ---------- sign-off, crew and load-plan follow-up (review of #83) ----------

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

        AssignCrewRequest.CrewItem item1 = AssignCrewRequest.CrewItem.builder()
                .userId(escortId)
                .crewRole(CrewRole.DRIVER)
                .build();
        AssignCrewRequest.CrewItem item2 = AssignCrewRequest.CrewItem.builder()
                .userId(escortId) // duplicate!
                .crewRole(CrewRole.GROOM)
                .build();
        AssignCrewRequest crewReq =
                AssignCrewRequest.builder().crew(List.of(item1, item2)).build();

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
        Trip otherTrip = trip();
        otherTrip.setCode("TRP-2026-002");
        TripVehicle otherVehicle = new TripVehicle();
        otherVehicle.setTrip(otherTrip);
        overlapping.setTripVehicle(otherVehicle);
        overlapping.setTrip(otherTrip);
        // Both trips carry the job between 06:00 and 14:00, so the driver can't be on both.
        lenient().when(jobTrips.jobsOn(any())).thenReturn(List.of(job));

        when(crewAssignmentRepository.findOnOtherOpenTrips(driverId, trip.getId()))
                .thenReturn(List.of(overlapping));

        AssignCrewRequest.CrewItem driverItem = AssignCrewRequest.CrewItem.builder()
                .userId(driverId)
                .crewRole(CrewRole.DRIVER)
                .build();

        AssignCrewRequest.CrewItem groomItem = AssignCrewRequest.CrewItem.builder()
                .userId(UUID.randomUUID())
                .crewRole(CrewRole.GROOM)
                .build();

        AssignCrewRequest crewReq =
                AssignCrewRequest.builder().crew(List.of(driverItem, groomItem)).build();

        User actor = new User();
        actor.setEmail("khoi.do@equifreight.vn");

        assertThrows(ConflictException.class, () -> crewAssignmentService.assignCrew(jobId, crewReq, actor));
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

        ClearanceStatusResponse gate = ClearanceStatusResponse.builder()
                .clearanceReady(false)
                .outstandingIssues(List.of("4 items outstanding"))
                .build();
        when(clearanceService.getClearanceStatus(jobId)).thenReturn(gate);

        assertThrows(BusinessException.class, () -> transportJobService.signOffTripPlan(jobId, manager));
    }

    @Test
    @DisplayName("A domestic leg before the border is signed off before the dossier clears (US-F2-13)")
    void signOff_domesticLegBeforeTheBorderSkipsTheGate() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = new TransportJob();
        job.setId(jobId);
        job.setCode("CBRT-2026-041");
        Trip toHub = new Trip();
        toHub.setId(UUID.randomUUID());
        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(jobTrips.tripOf(jobId, null)).thenReturn(toHub);
        when(jobTrips.beforeBorder(toHub, job)).thenReturn(true);

        BusinessException ex =
                assertThrows(BusinessException.class, () -> transportJobService.signOffTripPlan(jobId, new User()));

        // Past the gate: what stops it now is the route plan, not the dossier.
        assertTrue(ex.getMessage().contains("Route plan is not confirmed"), ex.getMessage());
        verify(clearanceService, never()).getClearanceStatus(jobId);
    }

    private static RouteStop stop(RouteStopKind kind, String at) {
        RouteStop st = new RouteStop();
        st.setKind(kind);
        st.setPlannedAt(at == null ? null : Instant.parse(at));
        return st;
    }

    private static RoutePlan planOf(Trip on, RouteStop... stops) {
        RoutePlan plan = new RoutePlan();
        plan.setId(UUID.randomUUID());
        plan.setTrip(on);
        plan.setVersionNo((short) 1);
        plan.getStops().addAll(List.of(stops));
        return plan;
    }

    /** The trip before {@code trip} in the job's journey, whose route hands its horses on at BKK airport. */
    private Trip tripBefore(TransportJob job, RouteStop... stops) {
        Trip before = new Trip();
        before.setId(UUID.randomUUID());
        before.setCode("TRP-2026-000");
        TripJob part = new TripJob();
        part.setTrip(before);
        part.setJob(job);
        when(jobTrips.partsBefore(trip, job)).thenReturn(List.of(part));
        when(routePlanRepository.findByTrip_IdAndStatus(before.getId(), RoutePlanStatus.DRAFT))
                .thenReturn(Optional.of(planOf(before, stops)));
        return before;
    }

    private static RouteStop transferAtBkk(String at, Integer stayMin) {
        Place bkk = new Place();
        bkk.setId(UUID.randomUUID());
        bkk.setName("BKK cargo terminal");
        RouteStop transfer = stop(RouteStopKind.TRANSFER, at);
        transfer.setPlace(bkk);
        transfer.setPlannedStayMin(stayMin == null ? null : stayMin.shortValue());
        return transfer;
    }

    private TransportJob chainedJob(UUID jobId) {
        TransportJob job = new TransportJob();
        job.setId(jobId);
        job.setCode("CBRT-2026-041");
        when(transportJobRepository.findById(jobId)).thenReturn(Optional.of(job));
        return job;
    }

    @Test
    @DisplayName("A later trip of a journey can't collect the horses before the trip before hands them on (US-F3-16)")
    void routePlan_refusesPickupBeforeThePreviousTransfer() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = chainedJob(jobId);
        // Handed on at 08:00 after a 24-hour stay, so ready on 19 Oct 08:00 UTC.
        tripBefore(
                job,
                stop(RouteStopKind.PICKUP, "2026-10-17T02:00:00Z"),
                transferAtBkk("2026-10-18T08:00:00Z", 24 * 60));
        RoutePlan plan = planOf(
                trip,
                stop(RouteStopKind.PICKUP, "2026-10-19T06:00:00Z"),
                stop(RouteStopKind.DELIVERY, "2026-10-19T12:00:00Z"));
        when(routePlanRepository.findById(plan.getId())).thenReturn(Optional.of(plan));

        BusinessException refused = assertThrows(
                BusinessException.class,
                () -> routePlanService.confirmRoutePlan(jobId, plan.getId(), "Test", new User()));
        assertThat(refused.getMessage()).contains("BKK cargo terminal", "TRP-2026-000", "19 Oct 15:00");
    }

    @Test
    @DisplayName("A later trip of a journey may collect the horses once their stay at the transfer is over")
    void routePlan_acceptsPickupAfterThePreviousTransferAndStay() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = chainedJob(jobId);
        tripBefore(
                job,
                stop(RouteStopKind.PICKUP, "2026-10-17T02:00:00Z"),
                transferAtBkk("2026-10-18T08:00:00Z", 24 * 60));
        RoutePlan plan = planOf(
                trip,
                stop(RouteStopKind.PICKUP, "2026-10-19T08:00:00Z"),
                stop(RouteStopKind.DELIVERY, "2026-10-19T12:00:00Z"));
        when(routePlanRepository.findById(plan.getId())).thenReturn(Optional.of(plan));
        when(routePlanRepository.save(any(RoutePlan.class))).thenAnswer(inv -> inv.getArgument(0));

        routePlanService.confirmRoutePlan(jobId, plan.getId(), "Test", new User());

        assertEquals(RoutePlanStatus.CONFIRMED, plan.getStatus());
    }

    @Test
    @DisplayName("A trip can't hand the horses on after the next trip of the journey collects them (US-F3-16)")
    void routePlan_refusesTransferAfterTheNextPickup() {
        UUID jobId = UUID.randomUUID();
        TransportJob job = chainedJob(jobId);
        when(jobTrips.handsOn(trip, job)).thenReturn(true);
        Trip next = new Trip();
        next.setId(UUID.randomUUID());
        next.setCode("TRP-2026-002");
        TripJob nextPart = new TripJob();
        nextPart.setTrip(next);
        nextPart.setJob(job);
        when(jobTrips.partAfter(trip, job)).thenReturn(Optional.of(nextPart));
        when(routePlanRepository.findByTrip_IdAndStatus(next.getId(), RoutePlanStatus.DRAFT))
                .thenReturn(Optional.empty());
        when(routePlanRepository.findByTrip_IdAndStatus(next.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(planOf(
                        next,
                        stop(RouteStopKind.PICKUP, "2026-10-18T10:00:00Z"),
                        stop(RouteStopKind.DELIVERY, "2026-10-18T14:00:00Z"))));
        RoutePlan plan = planOf(
                trip,
                stop(RouteStopKind.PICKUP, "2026-10-18T02:00:00Z"),
                transferAtBkk("2026-10-18T08:00:00Z", 4 * 60));
        when(routePlanRepository.findById(plan.getId())).thenReturn(Optional.of(plan));

        BusinessException refused = assertThrows(
                BusinessException.class,
                () -> routePlanService.confirmRoutePlan(jobId, plan.getId(), "Test", new User()));
        assertThat(refused.getMessage()).contains("TRP-2026-002", "18 Oct 17:00", "18 Oct 19:00");
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
        plan.setTrip(trip);
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
        // The customer hears about sharing or new times from the confirmation (US-F3-14).
        verify(tripNotices).confirmed(any(), eq(plan), any(), any());
    }

    @Test
    @DisplayName("Sign-off records who and when but leaves the stage for the departure to change")
    void signOff_keepsTheStageAndRecordsSignOff() {
        TransportJob job = readyJob();
        User manager = user("yen.vu@equifreight.vn", RoleName.LOGISTICS_MANAGER);
        stubPlansAndCrew(job, List.of());

        transportJobService.signOffTripPlan(job.getId(), manager);

        assertEquals(JobStage.CLEARANCE, job.getStage());
        assertNotNull(job.getSignedOffAt());
        assertEquals(manager, job.getSignedOffBy());
        verify(notificationService)
                .notify(
                        eq(NotificationKind.TRIP_RELEASED),
                        argThat(to -> to instanceof Audience.Escorts crew
                                && crew.users().size() == 2),
                        eq(Subject.job(job)),
                        contains("Trip plan signed off"),
                        any());
    }

    @Test
    @DisplayName("The job page says when the trip shown was signed off, and by whom (US-F3-08)")
    void jobDetail_showsTheTripSignOff() {
        TransportJob job = readyJob();
        User manager = user("yen.vu@equifreight.vn", RoleName.LOGISTICS_MANAGER);
        stubPlansAndCrew(job, List.of());
        TripJob part = new TripJob();
        part.setTrip(trip);
        part.setJob(job);
        when(jobTrips.findPartOf(trip, job)).thenReturn(Optional.of(part));

        assertNull(transportJobService.getJobDetail(job.getId()).tripSignedOffAt());

        Instant at = Instant.parse("2026-11-16T09:00:00Z");
        part.setSignedOffAt(at);
        part.setSignedOffBy(manager);
        JobDetailResponse detail = transportJobService.getJobDetail(job.getId());

        assertEquals(at, detail.tripSignedOffAt());
        assertEquals(manager.displayName(), detail.tripSignedOffBy());
    }

    @Test
    @DisplayName("Sign-off is refused while the journey ends short of the destination city (US-F3-21)")
    void signOff_refusesAJourneyShortOfTheDestination() {
        TransportJob job = readyJob();
        Corridor toAirport = new Corridor();
        toAirport.setCode("RD DAD → HCM");
        toAirport.setOriginCity("Da Nang");
        toAirport.setDestinationCity("Ho Chi Minh City");
        trip.setCorridor(toAirport);
        Place stables = new Place();
        stables.setName("Sha Tin stables");
        stables.setCity("Sha Tin");
        job.getRequest().setDestinationPlace(stables);
        stubPlansAndCrew(job, List.of());

        BusinessException refused = assertThrows(
                BusinessException.class, () -> transportJobService.signOffTripPlan(job.getId(), new User()));

        assertEquals(
                "Cannot sign off trip plan: CBRT-2026-041's journey ends in Ho Chi Minh City; the horses go to Sha Tin."
                        + " Add the trip there first.",
                refused.getMessage());
        assertNull(job.getSignedOffAt());
    }

    @Test
    @DisplayName("A flight is signed off only once its flight and times are set (US-F3-21)")
    void signOff_refusesAFlightWithoutItsTimes() {
        TransportJob job = readyJob();
        stubPlansAndCrew(job, List.of());
        RouteLeg air = new RouteLeg();
        air.setId(UUID.randomUUID());
        air.setMode(TransportMode.AIR);
        RoutePlan route = new RoutePlan();
        route.setTrip(trip);
        route.getLegs().add(air);
        when(routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(route));
        when(flights.findByRouteLegId(air.getId())).thenReturn(Optional.empty());

        BusinessException refused = assertThrows(
                BusinessException.class, () -> transportJobService.signOffTripPlan(job.getId(), new User()));

        assertEquals("Cannot sign off trip plan: enter the flight and its times first.", refused.getMessage());
    }

    @Test
    @DisplayName("A groom who rides the trailer to the airport is free for the flight of the next trip (US-F3-16)")
    void crewOverlap_comparesEachTripOfAJourneyOnItsOwnTimes() {
        Trip road = trip();
        when(routePlanRepository.findByTrip_IdAndStatus(road.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(planOf(
                        road,
                        stop(RouteStopKind.PICKUP, "2026-11-20T00:00:00Z"),
                        stop(RouteStopKind.TRANSFER, "2026-11-20T06:00:00Z"))));
        when(routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(planOf(
                        trip,
                        stop(RouteStopKind.PICKUP, "2026-11-20T10:00:00Z"),
                        stop(RouteStopKind.TRANSFER, "2026-11-20T14:00:00Z"))));
        CrewAssignment onTheTrailer = new CrewAssignment();
        onTheTrailer.setTrip(road);
        UUID groom = UUID.randomUUID();
        when(crewAssignmentRepository.findOnOtherOpenTrips(groom, trip.getId())).thenReturn(List.of(onTheTrailer));

        assertThat(crewAssignmentService.overlapping(groom, trip)).isEmpty();

        // Had the trailer been planned to reach the airport after the flight left, the groom couldn't be on both.
        when(routePlanRepository.findByTrip_IdAndStatus(road.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(planOf(
                        road,
                        stop(RouteStopKind.PICKUP, "2026-11-20T00:00:00Z"),
                        stop(RouteStopKind.TRANSFER, "2026-11-20T11:00:00Z"))));
        assertThat(crewAssignmentService.overlapping(groom, trip)).contains(onTheTrailer);
    }

    @Test
    @DisplayName("Sign-off refuses a crew member who is on another trip at the same time (US-F3-06)")
    void signOff_refusesOverlappingCrew() {
        TransportJob job = readyJob();
        CrewAssignment busy = new CrewAssignment();
        busy.setTripVehicle(new TripVehicle());
        busy.setTrip(trip());
        lenient().when(jobTrips.jobsOn(any())).thenReturn(List.of(job));
        stubPlansAndCrew(job, List.of(busy));

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> transportJobService.signOffTripPlan(
                        job.getId(), user("yen.vu@equifreight.vn", RoleName.LOGISTICS_MANAGER)));
        assertEquals("CREW_OVERLAP", ex.getCode());
        assertNull(job.getSignedOffAt());
    }

    @Test
    @DisplayName("The crew can still change after sign-off until departure, and the change clears the sign-off")
    void crewAssignment_afterSignOffBeforeDepartureClearsSignOff() {
        TransportJob job = readyJob();
        job.setSignedOffAt(Instant.now());
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        User driver = user("minh.tran@equifreight.vn", RoleName.ESCORT);
        User groom = user("hoa.le@equifreight.vn", RoleName.ESCORT);
        when(userRepository.findById(driver.getId())).thenReturn(Optional.of(driver));
        when(userRepository.findById(groom.getId())).thenReturn(Optional.of(groom));
        when(crewAssignmentRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        crewAssignmentService.assignCrew(
                job.getId(),
                crew(driver, CrewRole.DRIVER, groom, CrewRole.GROOM),
                user("khoi.do@equifreight.vn", RoleName.FLEET_COORDINATOR));

        assertNull(job.getSignedOffAt());
    }

    @Test
    @DisplayName("The crew can't change once the job has departed")
    void crewAssignment_refusedAfterDeparture() {
        TransportJob job = readyJob();
        job.setDepartedAt(Instant.now());
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        User driver = user("minh.tran@equifreight.vn", RoleName.ESCORT);

        assertThrows(
                BusinessException.class,
                () -> crewAssignmentService.assignCrew(
                        job.getId(),
                        crew(driver, CrewRole.DRIVER, driver, CrewRole.GROOM),
                        user("khoi.do@equifreight.vn", RoleName.FLEET_COORDINATOR)));
        verify(crewAssignmentRepository, never()).deleteByTripVehicleId(any());
    }

    @Test
    @DisplayName("A load plan can't be confirmed (and its vehicle booked) before the route sets the travel dates")
    void loadPlan_confirmRefusedWithoutPlannedDates() {
        TransportJob job = readyJob();
        job.setPlannedDepartureAt(null);
        job.setPlannedArrivalAt(null);
        job.getRequest().setHorses(List.of());
        LoadPlan plan = loadPlan(job);
        when(loadPlanRepository.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(plan));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> loadPlanService.confirmLoadPlan(
                        job.getId(), user("khoi.do@equifreight.vn", RoleName.FLEET_COORDINATOR)));
        assertTrue(ex.getMessage().contains("confirm the route plan first"));
        verify(vehicleBookingRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Auto-arrange replaces placements with a bulk delete that runs before the inserts")
    void loadPlan_autoArrangeUsesABulkDelete() {
        TransportJob job = readyJob();
        job.getRequest().setHorses(List.of());
        LoadPlan plan = loadPlan(job);
        when(loadPlanRepository.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(plan));

        loadPlanService.autoArrange(job.getId());

        verify(loadPlanStallRepository).deleteAllForLoadPlan(plan.getId());
        verify(loadPlanStallRepository, never()).deleteAll(anyList());
    }

    @Test
    @DisplayName("Moving a horse onto a stall someone else just filled is refused with 409, nothing changes (US-F3-05)")
    void loadPlan_move_refusesWhenTargetStallWasFilled() {
        MoveFixture f = new MoveFixture();
        Horse other = f.horse("Copper King");
        f.occupy(f.stall2, other);

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> loadPlanService.moveHorse(f.job.getId(), f.move(f.nightfall, null, f.stall2, null)));
        assertEquals("LOAD_PLAN_STALE", ex.getCode());
        assertTrue(ex.getMessage().contains("Stall 2 now holds Copper King"));
        verify(loadPlanStallRepository, never()).deleteByLoadPlanIdAndHorseId(any(), any());
        verify(loadPlanStallRepository, never()).save(any());
    }

    @Test
    @DisplayName("Moving a horse someone else already moved is refused with 409 (US-F3-05)")
    void loadPlan_move_refusesWhenHorseIsNoLongerWhereTheScreenShowed() {
        MoveFixture f = new MoveFixture();
        f.occupy(f.stall1, f.nightfall);

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> loadPlanService.moveHorse(f.job.getId(), f.move(f.nightfall, null, f.stall2, null)));
        assertTrue(ex.getMessage().contains("Nightfall is now in stall 1"));
        verify(loadPlanStallRepository, never()).save(any());
    }

    @Test
    @DisplayName("Dropping a placed horse on an occupied stall swaps the two in one transaction (US-F3-05)")
    void loadPlan_move_swapsWithTheOccupant() {
        MoveFixture f = new MoveFixture();
        Horse other = f.horse("Copper King");
        f.occupy(f.stall1, f.nightfall);
        f.occupy(f.stall2, other);
        f.job.setSignedOffAt(Instant.parse("2026-10-17T08:00:00Z"));

        loadPlanService.moveHorse(f.job.getId(), f.move(f.nightfall, f.stall1, f.stall2, other));

        verify(loadPlanStallRepository).deleteByLoadPlanIdAndHorseId(f.plan.getId(), f.nightfall.getId());
        verify(loadPlanStallRepository).deleteByLoadPlanIdAndVehicleStallId(f.plan.getId(), f.stall2.getId());
        verify(loadPlanStallRepository)
                .save(argThat(a -> a.getHorse() == f.nightfall && a.getVehicleStall() == f.stall2));
        verify(loadPlanStallRepository).save(argThat(a -> a.getHorse() == other && a.getVehicleStall() == f.stall1));
        assertNull(f.job.getSignedOffAt());
    }

    @Test
    @DisplayName("Dropping a waiting horse on an occupied stall sends the occupant back to the to-load list (US-F3-05)")
    void loadPlan_move_fromListSendsOccupantToTheList() {
        MoveFixture f = new MoveFixture();
        Horse other = f.horse("Copper King");
        f.occupy(f.stall2, other);

        loadPlanService.moveHorse(f.job.getId(), f.move(f.nightfall, null, f.stall2, other));

        verify(loadPlanStallRepository)
                .save(argThat(a -> a.getHorse() == f.nightfall && a.getVehicleStall() == f.stall2));
        verify(loadPlanStallRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("Dropping a placed horse on the to-load list takes it off the vehicle (US-F3-05)")
    void loadPlan_move_unloads() {
        MoveFixture f = new MoveFixture();
        f.occupy(f.stall1, f.nightfall);

        loadPlanService.moveHorse(f.job.getId(), f.move(f.nightfall, f.stall1, null, null));

        verify(loadPlanStallRepository).deleteByLoadPlanIdAndHorseId(f.plan.getId(), f.nightfall.getId());
        verify(loadPlanStallRepository, never()).save(any());
    }

    @Test
    @DisplayName("A confirmed load plan refuses moves (US-F3-05)")
    void loadPlan_move_refusedOnConfirmedPlan() {
        MoveFixture f = new MoveFixture();
        f.plan.setStatus(LoadPlanStatus.CONFIRMED);

        assertThrows(
                BusinessException.class,
                () -> loadPlanService.moveHorse(f.job.getId(), f.move(f.nightfall, null, f.stall1, null)));
        verify(loadPlanStallRepository, never()).save(any());
    }

    private TransportJob readyJob() {
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setStage(JobStage.CLEARANCE);
        job.setDossierStatus(DossierStatus.CLEARANCE_READY);
        job.setPlannedDepartureAt(Instant.parse("2026-10-18T06:00:00Z"));
        job.setPlannedArrivalAt(Instant.parse("2026-10-18T12:30:00Z"));
        Horse horse = new Horse();
        horse.setId(UUID.randomUUID());
        horse.setName("Nightfall");
        RequestHorse onRequest = new RequestHorse();
        onRequest.setHorse(horse);
        TransportRequest request = new TransportRequest();
        request.setHorses(List.of(onRequest));
        job.setRequest(request);
        return job;
    }

    private void stubPlansAndCrew(TransportJob job, List<CrewAssignment> overlaps) {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        ClearanceStatusResponse gate = ClearanceStatusResponse.builder()
                .clearanceReady(true)
                .outstandingIssues(List.of())
                .build();
        lenient().when(clearanceService.getClearanceStatus(job.getId())).thenReturn(gate);
        LoadPlan load = loadPlan(job);
        load.setStatus(LoadPlanStatus.CONFIRMED);
        lenient()
                .when(loadPlanRepository.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of(load));
        RoutePlan route = new RoutePlan();
        route.setTrip(trip);
        lenient()
                .when(routePlanRepository.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(route));
        CrewAssignment driver = assignment(user("minh.tran@equifreight.vn", RoleName.ESCORT), CrewRole.DRIVER);
        CrewAssignment groom = assignment(user("hoa.le@equifreight.vn", RoleName.ESCORT), CrewRole.GROOM);
        lenient().when(crewAssignmentRepository.findByTrip_Id(trip.getId())).thenReturn(List.of(driver, groom));
        lenient()
                .when(crewAssignmentRepository.findOnOtherOpenTrips(any(), eq(trip.getId())))
                .thenReturn(overlaps);
    }

    /**
     * One draft plan on a two-stall vehicle with Nightfall on the job, plus stubs for the move path.
     */
    private class MoveFixture {
        final TransportJob job = readyJob();
        final LoadPlan plan = loadPlan(job);
        final Horse nightfall = job.getRequest().getHorses().getFirst().getHorse();
        final VehicleStall stall1 = stall(1);
        final VehicleStall stall2 = stall(2);
        private final List<RequestHorse> onRequest =
                new ArrayList<>(job.getRequest().getHorses());

        MoveFixture() {
            job.getRequest().setHorses(onRequest);
            when(loadPlanRepository.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(plan));
            lenient().when(vehicleStallRepository.findById(stall1.getId())).thenReturn(Optional.of(stall1));
            lenient().when(vehicleStallRepository.findById(stall2.getId())).thenReturn(Optional.of(stall2));
            lenient()
                    .when(loadPlanStallRepository.findByLoadPlanIdAndHorseId(eq(plan.getId()), any()))
                    .thenReturn(Optional.empty());
            lenient()
                    .when(loadPlanStallRepository.findByLoadPlanIdAndVehicleStallId(eq(plan.getId()), any()))
                    .thenReturn(Optional.empty());
        }

        Horse horse(String name) {
            Horse h = new Horse();
            h.setId(UUID.randomUUID());
            h.setName(name);
            RequestHorse rh = new RequestHorse();
            rh.setHorse(h);
            onRequest.add(rh);
            return h;
        }

        void occupy(VehicleStall stall, Horse horse) {
            LoadPlanStall lps = new LoadPlanStall();
            lps.setLoadPlan(plan);
            lps.setVehicleStall(stall);
            lps.setHorse(horse);
            lenient()
                    .when(loadPlanStallRepository.findByLoadPlanIdAndHorseId(plan.getId(), horse.getId()))
                    .thenReturn(Optional.of(lps));
            lenient()
                    .when(loadPlanStallRepository.findByLoadPlanIdAndVehicleStallId(plan.getId(), stall.getId()))
                    .thenReturn(Optional.of(lps));
        }

        MoveHorseRequest move(Horse horse, VehicleStall from, VehicleStall to, Horse expectedOccupant) {
            MoveHorseRequest r = MoveHorseRequest.builder()
                    .horseId(horse.getId())
                    .fromStallId(from != null ? from.getId() : null)
                    .toStallId(to != null ? to.getId() : null)
                    .expectedOccupantId(expectedOccupant != null ? expectedOccupant.getId() : null)
                    .build();
            return r;
        }

        private VehicleStall stall(int positionNo) {
            VehicleStall s = new VehicleStall();
            s.setId(UUID.randomUUID());
            s.setVehicle(plan.getVehicle());
            s.setPositionNo((short) positionNo);
            s.setRowNo((short) 1);
            return s;
        }
    }

    @Test
    @DisplayName("A mare travelling with a foal at foot requires a full box (US-F3-05)")
    void loadPlan_conflict_mareWithFoalRequiresBox() {
        TransportJob job = readyJob();
        Horse mare = job.getRequest().getHorses().getFirst().getHorse();
        mare.setSex(HorseSex.MARE);
        job.getRequest().getHorses().getFirst().setWithFoal(true);

        LoadPlan plan = loadPlan(job);
        VehicleStall standardStall = new VehicleStall();
        standardStall.setId(UUID.randomUUID());
        standardStall.setStallType(StallType.STANDARD);
        standardStall.setRowNo((short) 1);

        LoadPlanStall assignment = new LoadPlanStall();
        assignment.setLoadPlan(plan);
        assignment.setHorse(mare);
        assignment.setVehicleStall(standardStall);

        List<LoadPlanConflictResponse> conflicts =
                loadPlanService.evaluateConflicts(plan, Set.of(mare.getId()), List.of(assignment));

        assertThat(conflicts)
                .anyMatch(c -> "BOX_REQUIRED".equals(c.rule())
                        && c.description().contains("mare with foal at foot takes a full box"));
    }

    @Test
    @DisplayName("A horse wider than 32 in cannot be placed in a standard stall (US-F3-05)")
    void loadPlan_conflict_horseWidthExceedsStandardStall() {
        TransportJob job = readyJob();
        Horse horse = job.getRequest().getHorses().getFirst().getHorse();
        HorseSizeClass sizeL = new HorseSizeClass();
        sizeL.setCode("L");
        sizeL.setWidthIn((short) 48);
        horse.setSizeClass(sizeL);

        LoadPlan plan = loadPlan(job);
        VehicleStall standardStall = new VehicleStall();
        standardStall.setId(UUID.randomUUID());
        standardStall.setStallType(StallType.STANDARD);
        standardStall.setRowNo((short) 1);

        LoadPlanStall assignment = new LoadPlanStall();
        assignment.setLoadPlan(plan);
        assignment.setHorse(horse);
        assignment.setVehicleStall(standardStall);

        List<LoadPlanConflictResponse> conflicts =
                loadPlanService.evaluateConflicts(plan, new HashSet<>(), List.of(assignment));

        assertThat(conflicts)
                .anyMatch(c ->
                        "WIDTH_EXCEEDED".equals(c.rule()) && c.description().contains("exceeds stall width"));
    }

    @Test
    @DisplayName("Auto-arranging a load plan with a mare and foal places her in a BOX stall (US-F3-05)")
    void loadPlan_autoArrange_mareWithFoalGetsBox() {
        TransportJob job = readyJob();
        Horse mare = job.getRequest().getHorses().getFirst().getHorse();
        mare.setSex(HorseSex.MARE);
        job.getRequest().getHorses().getFirst().setWithFoal(true);

        LoadPlan plan = loadPlan(job);

        VehicleStall standardStall = new VehicleStall();
        standardStall.setId(UUID.randomUUID());
        standardStall.setStallType(StallType.STANDARD);
        standardStall.setPositionNo((short) 1);
        standardStall.setRowNo((short) 1);

        VehicleStall boxStall = new VehicleStall();
        boxStall.setId(UUID.randomUUID());
        boxStall.setStallType(StallType.BOX);
        boxStall.setPositionNo((short) 2);
        boxStall.setRowNo((short) 1);
        standardStall.setVehicle(plan.getVehicle());
        boxStall.setVehicle(plan.getVehicle());

        when(loadPlanRepository.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(plan));
        when(vehicleStallRepository.findByVehicleIdOrderByPositionNo(
                        plan.getVehicle().getId()))
                .thenReturn(List.of(standardStall, boxStall));

        loadPlanService.autoArrange(job.getId());

        verify(loadPlanStallRepository).deleteAllForLoadPlan(plan.getId());
        verify(loadPlanStallRepository)
                .save(argThat(lps -> lps.getHorse().getId().equals(mare.getId())
                        && lps.getVehicleStall().getStallType() == StallType.BOX));
    }

    @Test
    @DisplayName("Fleet calendar can be filtered by vehicle kind (US-F3-07)")
    void fleetCalendar_filterByVehicleKind() {
        Vehicle trailer = new Vehicle();
        trailer.setId(UUID.randomUUID());
        trailer.setKind(VehicleKind.TRAILER);
        trailer.setCode("TR-01");

        Vehicle truck = new Vehicle();
        truck.setId(UUID.randomUUID());
        truck.setKind(VehicleKind.TRUCK);
        truck.setCode("TK-02");

        VehicleBooking b1 = new VehicleBooking();
        b1.setId(UUID.randomUUID());
        b1.setVehicle(trailer);
        b1.setKind(BookingKind.JOB);
        b1.setStartsAt(Instant.now());
        b1.setEndsAt(Instant.now().plusSeconds(3600));

        VehicleBooking b2 = new VehicleBooking();
        b2.setId(UUID.randomUUID());
        b2.setVehicle(truck);
        b2.setKind(BookingKind.MAINTENANCE);
        b2.setStartsAt(Instant.now());
        b2.setEndsAt(Instant.now().plusSeconds(3600));

        Instant from = Instant.now().minusSeconds(100);
        Instant to = Instant.now().plusSeconds(7200);

        when(vehicleBookingRepository.findInDateRange(from, to)).thenReturn(List.of(b1, b2));

        List<VehicleBookingResponse> trailersOnly = vehicleService.getFleetCalendar(from, to, VehicleKind.TRAILER);
        assertThat(trailersOnly).hasSize(1);
        assertThat(trailersOnly.getFirst().vehicleCode()).isEqualTo("TR-01");

        List<VehicleBookingResponse> allVehicles = vehicleService.getFleetCalendar(from, to, null);
        assertThat(allVehicles).hasSize(2);
    }
}
