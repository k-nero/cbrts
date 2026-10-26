package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.clearance.ClearanceStatusResponse;
import com.equifreight.model.job.AssignCrewRequest;
import com.equifreight.model.job.CrewMemberResponse;
import com.equifreight.model.job.MoveHorseRequest;
import com.equifreight.model.job.TripLoadResponse;
import com.equifreight.repository.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/** US-F3-10: a trip with several trailers, each with its own load plan and crew. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ConvoyTest {

    @Mock
    private LoadPlanRepository loadPlans;

    @Mock
    private LoadPlanStallRepository placements;

    @Mock
    private TransportJobRepository jobs;

    @Mock
    private VehicleRepository vehicles;

    @Mock
    private VehicleStallRepository stalls;

    @Mock
    private VehicleBookingRepository bookings;

    @Mock
    private CrewAssignmentRepository crew;

    @Mock
    private UserRepository users;

    @Mock
    private RoutePlanRepository routePlans;

    @Mock
    private JobTripService jobTrips;

    @Mock
    private RoutePlanService routePlanService;

    @Mock
    private ClearanceService clearance;

    @Mock
    private AuditService audit;

    private final VehicleAvailability availability = mock(VehicleAvailability.class);

    private LoadPlanService service;
    private CrewAssignmentService crewService;
    private TransportJobService jobService;

    private final Trip trip = new Trip();
    private final TransportJob job = new TransportJob();
    private final LoadPlan first = new LoadPlan();
    private final LoadPlan second = new LoadPlan();
    private final List<TripHorse> onTrip = new ArrayList<>();
    private final FlightService flightService = mock(FlightService.class);
    /** Placements by plan, as the repository would return them. */
    private final Map<UUID, List<LoadPlanStall>> placed = new HashMap<>();

    private static Vehicle vehicle(String code) {
        Vehicle vehicle = new Vehicle();
        vehicle.setId(UUID.randomUUID());
        vehicle.setCode(code);
        vehicle.setStatus(VehicleStatus.ACTIVE);
        vehicle.setPayloadKg(3200);
        return vehicle;
    }

    private static VehicleStall stall(Vehicle vehicle, int position, StallType type) {
        VehicleStall stall = new VehicleStall();
        stall.setId(UUID.randomUUID());
        stall.setVehicle(vehicle);
        stall.setPositionNo((short) position);
        stall.setRowNo((short) 1);
        stall.setStallType(type);
        return stall;
    }

    private void trailer(LoadPlan plan, String code, int seq, StallType stallType) {
        Vehicle vehicle = vehicle(code);
        TripVehicle tripVehicle = new TripVehicle();
        tripVehicle.setId(UUID.randomUUID());
        tripVehicle.setTrip(trip);
        tripVehicle.setVehicle(vehicle);
        tripVehicle.setSeq((short) seq);
        plan.setId(UUID.randomUUID());
        plan.setTripVehicle(tripVehicle);
        plan.setStatus(LoadPlanStatus.DRAFT);
        when(stalls.findByVehicleIdOrderByPositionNo(vehicle.getId()))
                .thenReturn(List.of(stall(vehicle, 1, stallType)));
        when(vehicles.findById(vehicle.getId())).thenReturn(Optional.of(vehicle));
        when(loadPlans.findByTripVehicle_Id(tripVehicle.getId())).thenReturn(Optional.of(plan));
        placed.put(plan.getId(), new ArrayList<>());
    }

    private Horse horse(String name, HorseSex sex) {
        Horse horse = new Horse();
        horse.setId(UUID.randomUUID());
        horse.setName(name);
        horse.setSex(sex);
        horse.setWeightKg((short) 500);
        TripHorse th = new TripHorse();
        th.setTrip(trip);
        th.setJob(job);
        th.setHorse(horse);
        onTrip.add(th);
        return horse;
    }

    private void place(LoadPlan plan, Horse horse) {
        LoadPlanStall lps = new LoadPlanStall();
        lps.setLoadPlan(plan);
        lps.setHorse(horse);
        lps.setVehicleStall(
                stalls.findByVehicleIdOrderByPositionNo(plan.getVehicle().getId())
                        .getFirst());
        placed.get(plan.getId()).add(lps);
        when(placements.findByLoadPlanIdAndHorseId(plan.getId(), horse.getId())).thenReturn(Optional.of(lps));
    }

    private User user(String name, String role) {
        Role r = new Role();
        r.setName(role);
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFirstName(name);
        user.setLastName("Test");
        user.setEmail(name.toLowerCase() + "@equifreight.vn");
        user.setRoles(Set.of(r));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        return user;
    }

    private CrewAssignment member(LoadPlan plan, User user, CrewRole role) {
        CrewAssignment ca = new CrewAssignment();
        ca.setTripVehicle(plan.getTripVehicle());
        ca.setUser(user);
        ca.setCrewRole(role);
        return ca;
    }

    @BeforeEach
    void setUp() {
        // A job's part departs with the job while it is on one trip.
        lenient().when(jobTrips.partDeparted(any(), any())).thenAnswer(inv -> {
            TransportJob j = inv.getArgument(1);
            return j.getDepartedAt() != null || j.getTripStatus() != TripStatus.NOT_STARTED;
        });
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-2026-014");
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setTripStatus(TripStatus.NOT_STARTED);
        job.setRequest(new TransportRequest());
        job.setPlannedDepartureAt(Instant.parse("2026-12-01T01:00:00Z"));
        job.setPlannedArrivalAt(Instant.parse("2026-12-02T09:00:00Z"));
        trailer(first, "TX-447", 1, StallType.BOX);
        trailer(second, "TK-102", 2, StallType.STANDARD);

        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(jobTrips.tripOf(job.getId())).thenReturn(trip);
        lenient().when(jobTrips.tripOf(eq(job.getId()), isNull())).thenReturn(trip);
        when(jobTrips.findTripOf(job.getId())).thenReturn(Optional.of(trip));
        lenient().when(jobTrips.findTripOf(eq(job.getId()), isNull())).thenReturn(Optional.of(trip));
        when(jobTrips.horsesOn(trip)).thenReturn(onTrip);
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(job));
        when(jobTrips.vehiclesOf(trip)).thenReturn(List.of(first.getTripVehicle(), second.getTripVehicle()));
        when(loadPlans.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(first, second));
        when(loadPlans.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of(first, second));
        when(placements.findByLoadPlanIdIn(any()))
                .thenAnswer(i -> placed.values().stream().flatMap(List::stream).toList());
        when(placements.findByLoadPlanId(any())).thenAnswer(i -> placed.get(i.<UUID>getArgument(0)));
        when(placements.findByLoadPlanIdAndHorseId(any(), any())).thenReturn(Optional.empty());
        when(placements.findByLoadPlanIdAndVehicleStallId(any(), any())).thenReturn(Optional.empty());
        when(bookings.findOverlappingBookings(any(), any(), any(), any())).thenReturn(List.of());
        when(bookings.findByTrip_IdAndVehicle_Id(any(), any())).thenReturn(Optional.empty());

        service = new LoadPlanService(
                loadPlans,
                placements,
                jobs,
                vehicles,
                stalls,
                bookings,
                crew,
                jobTrips,
                routePlanService,
                mock(BiosecurityService.class),
                audit,
                availability);
        crewService = new CrewAssignmentService(
                crew, jobs, users, jobTrips, loadPlans, placements, audit, flightService, routePlans);
        jobService = new TransportJobService(
                jobs,
                service,
                mock(RoutePlanService.class),
                crewService,
                loadPlans,
                routePlans,
                crew,
                clearance,
                audit,
                mock(NotificationService.class),
                mock(CodeService.class),
                jobTrips);
    }

    @Test
    @DisplayName("The trip's load lists every trailer, and a horse on any of them is placed")
    void theLoadListsEveryTrailer() {
        Horse shadowfax = horse("Shadowfax", HorseSex.GELDING);
        Horse nightfall = horse("Nightfall", HorseSex.MARE);
        place(second, nightfall);

        TripLoadResponse load = service.getActiveLoadPlan(job.getId()).orElseThrow();

        assertThat(load.tripCode()).isEqualTo("TRP-2026-014");
        assertThat(load.vehicles()).extracting(v -> v.vehicleCode()).containsExactly("TX-447", "TK-102");
        assertThat(load.unassignedHorses()).extracting(h -> h.name()).containsExactly(shadowfax.getName());
        assertThat(load.payloadKg()).isEqualTo(6400);
        assertThat(load.totalWeightKg()).isEqualTo(500);
    }

    @Test
    @DisplayName("A horse dropped on another trailer's stall moves to that trailer's plan")
    void aHorseMovesBetweenTrailers() {
        Horse nightfall = horse("Nightfall", HorseSex.MARE);
        place(first, nightfall);
        VehicleStall target = stalls.findByVehicleIdOrderByPositionNo(
                        second.getVehicle().getId())
                .getFirst();
        VehicleStall from = placed.get(first.getId()).getFirst().getVehicleStall();
        when(stalls.findById(target.getId())).thenReturn(Optional.of(target));

        service.moveHorse(
                job.getId(),
                MoveHorseRequest.builder()
                        .horseId(nightfall.getId())
                        .fromStallId(from.getId())
                        .toStallId(target.getId())
                        .build());

        verify(placements).deleteByLoadPlanIdAndHorseId(first.getId(), nightfall.getId());
        verify(placements)
                .save(argThat(lps ->
                        lps.getLoadPlan() == second && lps.getVehicleStall() == target && lps.getHorse() == nightfall));
    }

    @Test
    @DisplayName("The trip's load can't be confirmed while a horse isn't on any trailer")
    void confirmNeedsEveryHorsePlaced() {
        place(first, horse("Shadowfax", HorseSex.GELDING));
        horse("Nightfall", HorseSex.MARE);

        BusinessException ex = assertThrows(
                BusinessException.class, () -> service.confirmLoadPlan(job.getId(), user("Khoi", "FLEET_COORDINATOR")));

        assertThat(ex.getMessage()).contains("1 horses are still to be placed");
        verify(bookings, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Confirming the trip's load confirms and books every trailer for the trip's dates")
    void confirmBooksEveryTrailer() {
        place(first, horse("Shadowfax", HorseSex.GELDING));
        place(second, horse("Nightfall", HorseSex.MARE));

        service.confirmLoadPlan(job.getId(), user("Khoi", "FLEET_COORDINATOR"));

        assertThat(first.getStatus()).isEqualTo(LoadPlanStatus.CONFIRMED);
        assertThat(second.getStatus()).isEqualTo(LoadPlanStatus.CONFIRMED);
        for (LoadPlan plan : List.of(first, second)) {
            verify(bookings)
                    .saveAndFlush(argThat(b -> b.getTrip() == trip
                            && b.getVehicle() == plan.getVehicle()
                            && b.getKind() == BookingKind.JOB
                            && b.getStartsAt().equals(job.getPlannedDepartureAt())));
        }
    }

    @Test
    @DisplayName("Auto-arrange spreads the horses over the trailers, and a stallion and a mare can share a trip")
    void autoArrangeUsesEveryTrailer() {
        Horse copperKing = horse("Copper King", HorseSex.STALLION);
        Horse nightfall = horse("Nightfall", HorseSex.MARE);

        service.autoArrange(job.getId());

        verify(placements).save(argThat(lps -> lps.getHorse() == copperKing && lps.getLoadPlan() == first));
        verify(placements).save(argThat(lps -> lps.getHorse() == nightfall && lps.getLoadPlan() == second));
    }

    @Test
    @DisplayName("Adding a trailer reopens the trip: plans back to draft, the route superseded, the sign-off cleared")
    void addingATrailerReopensTheTrip() {
        first.setStatus(LoadPlanStatus.CONFIRMED);
        first.setConfirmedAt(Instant.now());
        second.setStatus(LoadPlanStatus.CONFIRMED);
        job.setSignedOffAt(Instant.now());
        Vehicle third = vehicle("TX-512");
        when(vehicles.findById(third.getId())).thenReturn(Optional.of(third));
        TripVehicle added = new TripVehicle();
        added.setId(UUID.randomUUID());
        added.setTrip(trip);
        added.setVehicle(third);
        added.setSeq((short) 3);
        when(jobTrips.addVehicle(trip, third)).thenReturn(added);
        when(loadPlans.save(any())).thenAnswer(i -> {
            LoadPlan plan = i.getArgument(0);
            plan.setId(UUID.randomUUID());
            return plan;
        });

        TripLoadResponse load = service.addVehicle(job.getId(), third.getId(), user("Khoi", "FLEET_COORDINATOR"));

        assertThat(load.vehicles()).extracting(v -> v.vehicleCode()).containsExactly("TX-447", "TK-102", "TX-512");
        assertThat(first.getStatus()).isEqualTo(LoadPlanStatus.DRAFT);
        assertThat(first.getConfirmedAt()).isNull();
        assertThat(second.getStatus()).isEqualTo(LoadPlanStatus.DRAFT);
        assertThat(job.getSignedOffAt()).isNull();
        verify(routePlanService).reopen(trip, "Trailer TX-512 added to the convoy");
        verify(audit)
                .recordDecision(
                        any(),
                        eq("ADD_TRIP_VEHICLE"),
                        any(),
                        eq("TRIP"),
                        eq(trip.getId()),
                        any(),
                        any(),
                        any(),
                        eq("TX-512"));
    }

    @Test
    @DisplayName("A trailer that may not run the trip is refused with the reason, and nothing is added (US-F3-19)")
    void unavailableTrailerRefused() {
        Vehicle third = vehicle("TX-512");
        when(vehicles.findById(third.getId())).thenReturn(Optional.of(third));
        doThrow(new BusinessException("VEHICLE_UNAVAILABLE", "TX-512 doesn't run RD HCM → PNH."))
                .when(availability)
                .require(third, trip);

        assertThatThrownBy(() -> service.addVehicle(job.getId(), third.getId(), user("Khoi", "FLEET_COORDINATOR")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("TX-512 doesn't run RD HCM → PNH.");
        verify(jobTrips, never()).addVehicle(any(), any());
    }

    @Test
    @DisplayName("A trailer can't be added or taken out after departure")
    void noTrailerChangesAfterDeparture() {
        job.setTripStatus(TripStatus.DEPARTED);
        job.setDepartedAt(Instant.now());
        User khoi = user("Khoi", "FLEET_COORDINATOR");

        assertThrows(BusinessException.class, () -> service.addVehicle(job.getId(), UUID.randomUUID(), khoi));
        assertThrows(
                BusinessException.class,
                () -> service.removeVehicle(job.getId(), second.getTripVehicle().getId(), khoi));
        verify(jobTrips, never()).addVehicle(any(), any());
        verify(jobTrips, never()).removeVehicle(any());
    }

    @Test
    @DisplayName("Taking a trailer out removes its plan, crew and booking, and reopens the trip")
    void takingATrailerOut() {
        VehicleBooking booking = new VehicleBooking();
        when(bookings.findByTrip_IdAndVehicle_Id(
                        trip.getId(), second.getVehicle().getId()))
                .thenReturn(Optional.of(booking));

        TripLoadResponse load =
                service.removeVehicle(job.getId(), second.getTripVehicle().getId(), user("Khoi", "FLEET_COORDINATOR"));

        assertThat(load.vehicles()).extracting(v -> v.vehicleCode()).containsExactly("TX-447");
        verify(bookings).delete(booking);
        verify(crew).deleteByTripVehicleId(second.getTripVehicle().getId());
        verify(loadPlans).delete(second);
        verify(jobTrips).removeVehicle(second.getTripVehicle());
        verify(routePlanService).reopen(trip, "Trailer TK-102 taken out of the convoy");
    }

    @Test
    @DisplayName("The last trailer can't be taken out")
    void theLastTrailerStays() {
        when(loadPlans.findByTripIdForUpdate(trip.getId())).thenReturn(List.of(first));

        assertThrows(
                BusinessException.class,
                () -> service.removeVehicle(job.getId(), first.getTripVehicle().getId(), user("Khoi", "X")));
        verify(jobTrips, never()).removeVehicle(any());
    }

    @Test
    @DisplayName("In a convoy the crew names its trailer, and needs a groom per three horses on that trailer")
    void crewIsPerTrailer() {
        User minh = user("Minh", RoleName.ESCORT);
        User hoa = user("Hoa", RoleName.ESCORT);
        AssignCrewRequest.CrewItem driver = AssignCrewRequest.CrewItem.builder()
                .userId(minh.getId())
                .crewRole(CrewRole.DRIVER)
                .build();
        AssignCrewRequest.CrewItem groom = AssignCrewRequest.CrewItem.builder()
                .userId(hoa.getId())
                .crewRole(CrewRole.GROOM)
                .build();
        User khoi = user("Khoi", "FLEET_COORDINATOR");

        // Which trailer?
        assertThrows(
                BusinessException.class,
                () -> crewService.assignCrew(job.getId(), new AssignCrewRequest(null, List.of(driver)), khoi));

        // TK-102 carries one horse: a driver alone is short of the one groom it needs.
        place(second, horse("Nightfall", HorseSex.MARE));
        UUID tk102 = second.getTripVehicle().getId();
        assertThrows(
                BusinessException.class,
                () -> crewService.assignCrew(job.getId(), new AssignCrewRequest(tk102, List.of(driver)), khoi));

        when(crew.saveAll(any())).thenAnswer(i -> i.getArgument(0));
        crewService.assignCrew(job.getId(), new AssignCrewRequest(tk102, List.of(driver, groom)), khoi);
        verify(crew).deleteByTripVehicleId(tk102);
        verify(crew).saveAll(argThat(saved -> {
            List<CrewAssignment> list = new ArrayList<>();
            saved.forEach(list::add);
            return list.size() == 2 && list.stream().allMatch(c -> c.getTripVehicle() == second.getTripVehicle());
        }));
    }

    @Test
    @DisplayName("One person rides one trailer of the convoy")
    void onePersonOneTrailer() {
        User minh = user("Minh", RoleName.ESCORT);
        when(crew.findByTrip_Id(trip.getId())).thenReturn(List.of(member(first, minh, CrewRole.DRIVER)));
        AssignCrewRequest.CrewItem driver = AssignCrewRequest.CrewItem.builder()
                .userId(minh.getId())
                .crewRole(CrewRole.DRIVER)
                .build();

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> crewService.assignCrew(
                        job.getId(),
                        new AssignCrewRequest(second.getTripVehicle().getId(), List.of(driver)),
                        user("Khoi", "X")));
        assertThat(ex.getMessage()).contains("already on another trailer");
    }

    @Test
    @DisplayName("The flight crew is flying grooms and the vet, one groom per three horses on board, on no trailer")
    void theFlightCrew() {
        for (int i = 0; i < 4; i++) onTrip.add(new TripHorse());
        RoutePlan route = new RoutePlan();
        when(flightService.currentRoute(trip)).thenReturn(Optional.of(route));
        when(flightService.flightsOf(route)).thenReturn(List.of(new Flight()));
        when(crew.saveAll(any())).thenAnswer(i -> i.getArgument(0));
        User lan = user("Lan", RoleName.ESCORT);
        User hoa = user("Hoa", RoleName.ESCORT);
        User vet = user("Vet", RoleName.ESCORT);
        AssignCrewRequest.CrewItem g1 = new AssignCrewRequest.CrewItem(lan.getId(), CrewRole.FLYING_GROOM);
        AssignCrewRequest.CrewItem g2 = new AssignCrewRequest.CrewItem(hoa.getId(), CrewRole.FLYING_GROOM);
        AssignCrewRequest.CrewItem v = new AssignCrewRequest.CrewItem(vet.getId(), CrewRole.VET);

        BusinessException few = assertThrows(
                BusinessException.class,
                () -> crewService.assignCrew(
                        job.getId(), new AssignCrewRequest(null, List.of(g1, v), true), user("Khoi", "X")));
        assertThat(few.getMessage()).contains("At least 2 flying groom(s) required for 4 horses on the flight");
        BusinessException driver = assertThrows(
                BusinessException.class,
                () -> crewService.assignCrew(
                        job.getId(),
                        new AssignCrewRequest(
                                null, List.of(new AssignCrewRequest.CrewItem(lan.getId(), CrewRole.DRIVER)), true),
                        user("Khoi", "X")));
        assertThat(driver.getMessage()).isEqualTo("The flight crew is flying grooms and the flight vet");

        List<CrewMemberResponse> saved = crewService.assignCrew(
                job.getId(), new AssignCrewRequest(null, List.of(g1, g2, v), true), user("Khoi", "X"));

        assertThat(saved).allMatch(c -> c.onFlight() && c.tripVehicleId() == null);
        verify(crew).deleteFlightCrew(trip.getId());
    }

    @Test
    @DisplayName("A trip without a flight has no flight crew")
    void noFlightCrewWithoutAFlight() {
        when(flightService.currentRoute(trip)).thenReturn(Optional.empty());

        assertThrows(
                BusinessException.class,
                () -> crewService.assignCrew(
                        job.getId(), new AssignCrewRequest(null, List.of(), true), user("K", "X")));
    }

    @Test
    @DisplayName("Sign-off needs a driver on every trailer of the convoy")
    void signOffNeedsADriverOnEveryTrailer() {
        first.setStatus(LoadPlanStatus.CONFIRMED);
        second.setStatus(LoadPlanStatus.CONFIRMED);
        when(clearance.getClearanceStatus(job.getId()))
                .thenReturn(ClearanceStatusResponse.builder()
                        .clearanceReady(true)
                        .outstandingIssues(List.of())
                        .build());
        when(routePlans.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(new RoutePlan()));
        User minh = user("Minh", RoleName.ESCORT);
        when(crew.findByTrip_Id(trip.getId())).thenReturn(List.of(member(first, minh, CrewRole.DRIVER)));

        BusinessException ex =
                assertThrows(BusinessException.class, () -> jobService.signOffTripPlan(job.getId(), user("Yen", "X")));

        assertThat(ex.getMessage()).contains("DRIVER").contains("TK-102");
    }
}
