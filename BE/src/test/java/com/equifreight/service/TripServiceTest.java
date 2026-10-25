package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.trip.TripConditionRequest;
import com.equifreight.model.trip.TripRecordRequest;
import com.equifreight.model.trip.TripSummaryResponse;
import com.equifreight.model.trip.TripViewResponse;
import com.equifreight.repository.*;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TripServiceTest {

    private static final Instant NOW = Instant.now();

    @Mock
    private TransportJobRepository jobs;

    @Mock
    private CrewAssignmentRepository crew;

    @Mock
    private TripRecordRepository records;

    @Mock
    private RoutePlanRepository routes;

    @Mock
    private LoadPlanRepository loads;

    @Mock
    private RequestHorseRepository requestHorses;

    @Mock
    private FileService files;

    @Mock
    private HandoverRepository handovers;

    @Mock
    private AuditService audit;

    @Mock
    private NotificationService notifications;

    @Mock
    private TripNotices notices;

    @Mock
    private JobTripService jobTrips;

    private final FlightRepository flightsByLeg = mock(FlightRepository.class);

    private TripService service;

    private Trip trip;

    private User coordinator;
    private User escort;
    private TransportJob job;
    private Horse shadowfax;
    private Horse nightfall;
    private TripVehicle trailer;

    private static TripRecordRequest request(TripRecordKind kind, Instant at, List<TripConditionRequest> conditions) {
        return new TripRecordRequest(null, kind, at, UUID.randomUUID(), null, conditions, null, null);
    }

    private TripRecordRequest handover(Instant at, String receiverName) {
        return handover(at, receiverName, true, List.of(condition(shadowfax, List.of())));
    }

    private static TripRecordRequest handover(
            Instant at, String receiverName, Boolean confirmed, List<TripConditionRequest> conditions) {
        return new TripRecordRequest(
                null,
                TripRecordKind.HANDED_OVER,
                at,
                UUID.randomUUID(),
                "Passport and two head collars",
                conditions,
                receiverName,
                confirmed);
    }

    // ---------- clearance gate (US-F2-08 / US-F4-02) ----------

    private static TripConditionRequest condition(Horse horse, List<UUID> photos) {
        return new TripConditionRequest(horse.getId(), HorseCondition.SOUND, true, true, null, photos);
    }

    private static Horse horse(String name) {
        Horse horse = new Horse();
        horse.setId(UUID.randomUUID());
        horse.setName(name);
        return horse;
    }

    // ---------- order of events ----------

    @BeforeEach
    void setUp() {
        Role role = new Role();
        role.setName(RoleName.FLEET_COORDINATOR);
        coordinator = new User();
        coordinator.setId(UUID.randomUUID());
        coordinator.setFirstName("Khôi");
        coordinator.setLastName("Đỗ");
        coordinator.setRoles(Set.of(role));
        Role escortRole = new Role();
        escortRole.setName(RoleName.ESCORT);
        escort = new User();
        escort.setId(UUID.randomUUID());
        escort.setFirstName("Minh");
        escort.setLastName("Trần");
        escort.setRoles(Set.of(escortRole));

        service = new TripService(
                jobs,
                crew,
                records,
                routes,
                loads,
                requestHorses,
                handovers,
                files,
                audit,
                notifications,
                notices,
                jobTrips,
                flightsByLeg,
                Clock.fixed(NOW, ZoneOffset.UTC));

        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setRequest(request);
        job.setStage(JobStage.CLEARANCE);
        job.setTripStatus(TripStatus.NOT_STARTED);
        job.setDossierStatus(DossierStatus.CLEARANCE_READY);
        job.setClearanceReadyAt(NOW.minus(Duration.ofDays(1)));
        job.setSignedOffAt(NOW.minus(Duration.ofHours(12)));

        trip = new Trip();
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-2026-001");
        lenient().when(jobTrips.tripOf(job.getId())).thenReturn(trip);
        lenient().when(jobTrips.tripOf(eq(job.getId()), isNull())).thenReturn(trip);
        // Each job's part on the trip, mirroring the job when first asked: one trip per job here.
        java.util.Map<UUID, TripJob> parts = new java.util.HashMap<>();
        java.util.function.Function<TransportJob, TripJob> partFor = j -> parts.computeIfAbsent(j.getId(), id -> {
            TripJob part = new TripJob();
            part.setTrip(trip);
            part.setJob(j);
            part.setStatus(j.getTripStatus());
            part.setDepartedAt(j.getDepartedAt());
            part.setSignedOffAt(j.getSignedOffAt());
            return part;
        });
        lenient().when(jobTrips.partOf(any(), any())).thenAnswer(inv -> partFor.apply(inv.getArgument(1)));
        lenient().when(jobTrips.partsOf(any())).thenAnswer(inv -> List.of(partFor.apply(inv.getArgument(0))));
        lenient().when(jobTrips.activePartsOf(any())).thenAnswer(inv -> List.of(partFor.apply(inv.getArgument(0))));

        shadowfax = horse("Shadowfax");
        nightfall = horse("Nightfall");

        when(jobs.findByCodeForUpdate(job.getCode())).thenReturn(Optional.of(job));
        when(records.findByClientRef(any())).thenReturn(Optional.empty());
        when(records.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(records.findTopByTrip_IdAndKindInOrderByOccurredAtDesc(eq(trip.getId()), anyCollection()))
                .thenReturn(Optional.empty());
        when(crew.existsByTrip_IdAndUser_Id(trip.getId(), escort.getId())).thenReturn(true);
        trailer = trailer(1, "TX-447");
        lenient()
                .when(crew.findByTrip_IdAndUser_Id(trip.getId(), escort.getId()))
                .thenReturn(List.of(seat(trailer)));
        when(handovers.findByJob_Id(job.getId())).thenReturn(Optional.empty());
        when(handovers.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Departure is refused until the dossier is CLEARANCE_READY")
    void departureIsRefusedBeforeClearance() {
        job.setDossierStatus(DossierStatus.OPEN);
        job.setClearanceReadyAt(null);

        BusinessException ex = assertThrows(BusinessException.class, () -> record(TripRecordKind.DEPARTED, NOW));
        assertEquals("CLEARANCE_REQUIRED", ex.getCode());
        verify(records, never()).save(any());
    }

    @Test
    @DisplayName("Departure on a clear dossier starts the trip")
    void departureStartsTheTrip() {
        record(TripRecordKind.DEPARTED, NOW);

        assertEquals(TripStatus.DEPARTED, job.getTripStatus());
        assertEquals(JobStage.TRIP, job.getStage());
        assertEquals(NOW, job.getDepartedAt());
    }

    @Test
    @DisplayName("A hold can't be recorded before the trip departs")
    void holdBeforeDepartureIsRefused() {
        ConflictException ex = assertThrows(ConflictException.class, () -> record(TripRecordKind.HELD, NOW));
        assertEquals("TRIP_STATE_CONFLICT", ex.getCode());
        verify(records, never()).save(any());
    }

    @Test
    @DisplayName("A condition check is allowed at loading, before departure")
    void conditionCheckIsAllowedAtLoading() {
        stubHorses();

        service.addCoordinatorRecord(
                job.getCode(),
                coordinator,
                request(TripRecordKind.CONDITION_CHECK, NOW, List.of(condition(shadowfax, List.of()))));

        verify(records).save(any());
        assertEquals(TripStatus.NOT_STARTED, job.getTripStatus());
    }

    @Test
    @DisplayName("Landing keeps an air trip in transit so release, customs and the ground leg can follow")
    void flightLandingKeepsTheTripInTransit() {
        departed();

        record(TripRecordKind.FLIGHT_LANDED, NOW);
        assertEquals(TripStatus.DEPARTED, job.getTripStatus());

        record(TripRecordKind.RELEASED_BY_AIRLINE, NOW.plusSeconds(60));
        record(TripRecordKind.CLEARED_BORDER, NOW.plusSeconds(120));
        verify(records, org.mockito.Mockito.times(3)).save(any());
    }

    @Test
    @DisplayName("A checkpoint synced late from the cab is logged without moving the status back")
    void lateSyncedCheckpointIsLoggedWithoutChangingStatus() {
        departed();
        job.setTripStatus(TripStatus.DELIVERED);
        job.setStage(JobStage.HANDOVER);
        when(records.findTopByTrip_IdAndKindInOrderByOccurredAtDesc(eq(trip.getId()), anyCollection()))
                .thenReturn(Optional.of(stored(TripRecordKind.DELIVERED, NOW.minusSeconds(600))));

        record(TripRecordKind.ARRIVED_AT_STOP, NOW.minusSeconds(3_000));

        verify(records).save(any());
        assertEquals(TripStatus.DELIVERED, job.getTripStatus());
        assertEquals(JobStage.HANDOVER, job.getStage());
    }

    // ---------- condition checks (US-F4-03) ----------

    @Test
    @DisplayName("A lifecycle step older than the latest status update is refused")
    void lateLifecycleStepIsRefused() {
        departed();
        when(records.findTopByTrip_IdAndKindInOrderByOccurredAtDesc(eq(trip.getId()), anyCollection()))
                .thenReturn(Optional.of(stored(TripRecordKind.CLEARED_BORDER, NOW.minusSeconds(600))));

        assertThrows(ConflictException.class, () -> record(TripRecordKind.HELD, NOW.minusSeconds(1_200)));
        verify(records, never()).save(any());
    }

    @Test
    @DisplayName("A record dated in the future is refused")
    void futureRecordIsRefused() {
        BusinessException ex =
                assertThrows(BusinessException.class, () -> record(TripRecordKind.NOTE, NOW.plus(Duration.ofHours(1))));
        assertEquals("TRIP_RECORD_IN_FUTURE", ex.getCode());
    }

    // ---------- helpers ----------

    @Test
    @DisplayName("A closed trip takes no new events")
    void closedTripIsRefused() {
        job.setStage(JobStage.CLOSED);

        assertThrows(ConflictException.class, () -> record(TripRecordKind.NOTE, NOW));
    }

    @Test
    @DisplayName("Horse observations must be sent as a condition check")
    void observationsRequireTheConditionCheckKind() {
        departed();
        stubHorses();

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.addCoordinatorRecord(
                        job.getCode(),
                        coordinator,
                        request(TripRecordKind.ARRIVED_AT_STOP, NOW, List.of(condition(shadowfax, List.of())))));
        assertEquals("CONDITION_CHECK_KIND_REQUIRED", ex.getCode());
    }

    @Test
    @DisplayName("The same photo can't be attached to two horses in one check")
    void samePhotoOnTwoHorsesIsRefused() {
        departed();
        stubHorses();
        UUID photo = UUID.randomUUID();
        when(files.requireAttachable(eq(photo), any())).thenReturn(new StoredFile());

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.addCoordinatorRecord(
                        job.getCode(),
                        coordinator,
                        request(
                                TripRecordKind.CONDITION_CHECK,
                                NOW,
                                List.of(condition(shadowfax, List.of(photo)), condition(nightfall, List.of(photo))))));
        assertEquals("DUPLICATE_PHOTO", ex.getCode());
        verify(records, never()).save(any());
    }

    // ---------- sign-off gate (US-F3-08) ----------

    @Test
    @DisplayName("Departure is refused until the logistics manager signs off the trip plan")
    void departureIsRefusedWithoutSignOff() {
        job.setSignedOffAt(null);

        BusinessException ex = assertThrows(BusinessException.class, () -> record(TripRecordKind.DEPARTED, NOW));
        assertEquals("SIGN_OFF_REQUIRED", ex.getCode());
        verify(records, never()).save(any());
    }

    @Test
    @DisplayName("The next flight leg of a trip already on its way doesn't ask for the sign-off again")
    void laterFlightLegSkipsTheSignOffGate() {
        departed();
        job.setSignedOffAt(null);

        record(TripRecordKind.FLIGHT_DEPARTED, NOW);

        verify(records).save(any());
        assertEquals(NOW.minus(Duration.ofHours(6)), job.getDepartedAt());
    }

    // ---------- holds ----------

    @Test
    @DisplayName("The cab can't release a hold: it stays held until staff decide")
    void escortCannotReleaseAHold() {
        departed();
        job.setTripStatus(TripStatus.HELD);

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.addEscortRecord(
                        job.getCode(), escort, request(TripRecordKind.CLEARED_BORDER, NOW, null)));
        assertEquals("HOLD_RELEASE_BY_STAFF", ex.getCode());
        assertEquals(TripStatus.HELD, job.getTripStatus());
        verify(records, never()).save(any());
    }

    @Test
    @DisplayName("The cab can still log a note on a held trip")
    void escortCanLogANoteWhileHeld() {
        departed();
        job.setTripStatus(TripStatus.HELD);

        service.addEscortRecord(job.getCode(), escort, request(TripRecordKind.NOTE, NOW, null));

        verify(records).save(any());
        assertEquals(TripStatus.HELD, job.getTripStatus());
    }

    @Test
    @DisplayName("Staff release a hold and the trip is back on the road")
    void coordinatorReleasesAHold() {
        departed();
        job.setTripStatus(TripStatus.HELD);

        record(TripRecordKind.LEFT_STOP, NOW);

        assertEquals(TripStatus.DEPARTED, job.getTripStatus());
    }

    @Test
    @DisplayName("A hold alerts the logistics manager and the coordinator")
    void holdAlertsTheDeciders() {
        departed();

        service.addEscortRecord(
                job.getCode(),
                escort,
                new TripRecordRequest(
                        null,
                        TripRecordKind.HELD,
                        NOW,
                        UUID.randomUUID(),
                        "Vet check at the border",
                        null,
                        null,
                        null));

        assertEquals(TripStatus.HELD, job.getTripStatus());
        verify(notifications)
                .notify(
                        NotificationKind.TRIP_HELD,
                        Audience.role(RoleName.LOGISTICS_MANAGER),
                        Subject.job(job),
                        "Trip CBRT-2026-041 held",
                        "Vet check at the border");
        verify(notifications)
                .notify(
                        NotificationKind.TRIP_HELD,
                        Audience.role(RoleName.FLEET_COORDINATOR),
                        Subject.job(job),
                        "Trip CBRT-2026-041 held",
                        "Vet check at the border");
    }

    // ---------- handover ----------

    @Test
    @DisplayName("Delivery opens the job's handover row")
    void deliveryOpensTheHandover() {
        departed();
        job.setTripStatus(TripStatus.ARRIVED);

        record(TripRecordKind.DELIVERED, NOW);

        ArgumentCaptor<Handover> saved = ArgumentCaptor.forClass(Handover.class);
        verify(handovers).save(saved.capture());
        assertEquals(job, saved.getValue().getJob());
        assertEquals(NOW, saved.getValue().getDeliveredAt());
    }

    // ---------- the trip the job travels on (US-F3-09) ----------

    @Test
    @DisplayName("The log is the trip's, and departure puts the trip in transit with its job")
    void departureMovesTheTrip() {
        record(TripRecordKind.DEPARTED, NOW);

        ArgumentCaptor<TripRecord> saved = ArgumentCaptor.forClass(TripRecord.class);
        verify(records).save(saved.capture());
        assertEquals(trip, saved.getValue().getTrip());
        assertEquals(TripStatus.DEPARTED, trip.getStatus());
    }

    @Test
    @DisplayName("Delivery takes the job's horses off the trip")
    void deliveryTakesTheHorsesOffTheTrip() {
        departed();
        job.setTripStatus(TripStatus.ARRIVED);

        record(TripRecordKind.DELIVERED, NOW);

        assertEquals(TripStatus.DELIVERED, trip.getStatus());
        verify(jobTrips).markDelivered(trip, job);
    }

    // ---------- what the customer is told (US-F4-05) ----------

    @Test
    @DisplayName("Customs cleared tells every job on board")
    void customsClearedTellsEveryJob() {
        departed();
        TransportJob other = sharedWith();

        record(TripRecordKind.CLEARED_BORDER, NOW);

        verify(notices).clearedCustoms(eq(job), isNull(), eq(NOW), any());
        verify(notices).clearedCustoms(eq(other), isNull(), eq(NOW), any());
    }

    @Test
    @DisplayName("Arriving at the job's delivery stop tells its customer")
    void arrivalAtDeliveryIsAnnounced() {
        departed();
        RouteStop stop = deliveryOf(job);

        service.addCoordinatorRecord(
                job.getCode(),
                coordinator,
                new TripRecordRequest(
                        stop.getId(), TripRecordKind.ARRIVED_AT_STOP, NOW, UUID.randomUUID(), null, null, null, null));

        verify(notices).arrived(job, trip, stop, NOW);
    }

    @Test
    @DisplayName("The delivery after the arrival doesn't tell the customer again")
    void deliveryAfterArrivalIsQuiet() {
        departed();
        job.setTripStatus(TripStatus.ARRIVED);

        record(TripRecordKind.DELIVERED, NOW);

        verify(notices, never()).arrived(any(), any(), any(), any());
    }

    @Test
    @DisplayName("A checkpoint synced late tells nobody")
    void lateRecordIsQuiet() {
        departed();
        when(records.findTopByTrip_IdAndKindInOrderByOccurredAtDesc(eq(trip.getId()), anyCollection()))
                .thenReturn(Optional.of(stored(TripRecordKind.LEFT_STOP, NOW.minus(Duration.ofMinutes(5)))));

        record(TripRecordKind.CLEARED_BORDER, NOW.minus(Duration.ofMinutes(30)));

        verify(notices, never()).clearedCustoms(any(), any(), any(), any());
    }

    // ---------- a shared trailer (US-F3-11) ----------

    /** Puts a second job, CBRT-2026-042, on the trip with its own delivery stop. */
    private TransportJob sharedWith() {
        TransportRequest request = new TransportRequest();
        request.setId(UUID.randomUUID());
        TransportJob other = new TransportJob();
        other.setId(UUID.randomUUID());
        other.setCode("CBRT-2026-042");
        other.setRequest(request);
        other.setStage(job.getStage());
        other.setTripStatus(job.getTripStatus());
        other.setDepartedAt(job.getDepartedAt());
        other.setDossierStatus(DossierStatus.CLEARANCE_READY);
        other.setClearanceReadyAt(NOW.minus(Duration.ofDays(1)));
        other.setSignedOffAt(job.getSignedOffAt());
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(job, other));
        when(jobTrips.horsesEverOn(trip)).thenReturn(List.of(rider(job, shadowfax), rider(other, nightfall)));
        return other;
    }

    private RouteStop deliveryOf(TransportJob owner) {
        RouteStop stop = new RouteStop();
        stop.setId(UUID.randomUUID());
        stop.setKind(RouteStopKind.DELIVERY);
        stop.setJob(owner);
        Place place = new Place();
        place.setName("Chao Phraya Racing Stables");
        stop.setPlace(place);
        RoutePlan plan = new RoutePlan();
        plan.setStops(new ArrayList<>(List.of(stop)));
        when(routes.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(plan));
        return stop;
    }

    private TripHorse rider(TransportJob owner, Horse horse) {
        TripHorse th = new TripHorse();
        th.setTrip(trip);
        th.setJob(owner);
        th.setHorse(horse);
        th.setStatus(TripHorseStatus.ON_TRIP);
        return th;
    }

    private TripVehicle trailer(int seq, String code) {
        Vehicle vehicle = new Vehicle();
        vehicle.setId(UUID.randomUUID());
        vehicle.setCode(code);
        TripVehicle tv = new TripVehicle();
        tv.setId(UUID.randomUUID());
        tv.setTrip(trip);
        tv.setVehicle(vehicle);
        tv.setSeq((short) seq);
        return tv;
    }

    private CrewAssignment seat(TripVehicle tv) {
        CrewAssignment c = new CrewAssignment();
        c.setTripVehicle(tv);
        c.setUser(escort);
        c.setCrewRole(CrewRole.GROOM);
        return c;
    }

    /** A confirmed load plan for {@code tv} with {@code horses} in stalls 1, 2, … */
    private LoadPlan loaded(TripVehicle tv, Horse... horses) {
        LoadPlan plan = new LoadPlan();
        plan.setId(UUID.randomUUID());
        plan.setTripVehicle(tv);
        plan.setStatus(LoadPlanStatus.CONFIRMED);
        for (int i = 0; i < horses.length; i++) {
            VehicleStall vs = new VehicleStall();
            vs.setPositionNo((short) (i + 1));
            vs.setStallType(StallType.STANDARD);
            LoadPlanStall stall = new LoadPlanStall();
            stall.setLoadPlan(plan);
            stall.setVehicleStall(vs);
            stall.setHorse(horses[i]);
            plan.getStalls().add(stall);
        }
        return plan;
    }

    @Test
    @DisplayName("A shared trip can't depart while one of its jobs isn't cleared, and the refusal names it")
    void aSharedTripWaitsForEveryJob() {
        TransportJob other = sharedWith();
        other.setDossierStatus(DossierStatus.OPEN);
        other.setClearanceReadyAt(null);

        BusinessException ex = assertThrows(BusinessException.class, () -> record(TripRecordKind.DEPARTED, NOW));

        assertEquals("CLEARANCE_REQUIRED", ex.getCode());
        assertTrue(ex.getMessage().contains("CBRT-2026-042"));
        verify(records, never()).save(any());
    }

    @Test
    @DisplayName("Departure moves every job on a shared trip")
    void departureMovesEveryJob() {
        TransportJob other = sharedWith();

        record(TripRecordKind.DEPARTED, NOW);

        assertEquals(TripStatus.DEPARTED, job.getTripStatus());
        assertEquals(TripStatus.DEPARTED, other.getTripStatus());
        assertEquals(NOW, other.getDepartedAt());
        assertEquals(TripStatus.DEPARTED, trip.getStatus());
    }

    @Test
    @DisplayName("A delivery at one job's stop delivers that job only; the trip carries on with the other")
    void deliveryIsPerJob() {
        departed();
        TransportJob other = sharedWith();
        other.setTripStatus(TripStatus.ARRIVED);
        RouteStop stop = deliveryOf(other);
        when(jobTrips.jobsOn(trip)).thenReturn(List.of(job, other)).thenReturn(List.of(job));

        service.addCoordinatorRecord(
                job.getCode(),
                coordinator,
                new TripRecordRequest(
                        stop.getId(), TripRecordKind.DELIVERED, NOW, UUID.randomUUID(), null, null, null, null));

        assertEquals(TripStatus.DELIVERED, other.getTripStatus());
        assertEquals(TripStatus.DEPARTED, job.getTripStatus());
        assertEquals(TripStatus.DEPARTED, trip.getStatus());
        verify(jobTrips).markDelivered(trip, other);
        verify(jobTrips, never()).markDelivered(trip, job);
    }

    @Test
    @DisplayName("The customer of a shared trip sees nothing of the other client: not its stops or its horses")
    void theCustomerSeesOnlyTheirOwn() {
        departed();
        TransportJob other = sharedWith();
        RouteStop othersStop = deliveryOf(other);
        Club club = new Club();
        club.setId(UUID.randomUUID());
        job.getRequest().setClub(club);
        User customer = new User();
        customer.setClub(club);
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        RequestHorse own = new RequestHorse();
        own.setHorse(shadowfax);
        when(requestHorses.findByRequest_Id(job.getRequest().getId())).thenReturn(List.of(own));
        TripRecord check = stored(TripRecordKind.CONDITION_CHECK, NOW.minusSeconds(60));
        for (Horse horse : List.of(shadowfax, nightfall)) {
            ConditionLog log = new ConditionLog();
            log.setTripRecord(check);
            log.setHorse(horse);
            log.setCondition(HorseCondition.SOUND);
            check.getConditionLogs().add(log);
        }
        TripRecord atOthersStop = stored(TripRecordKind.DELIVERED, NOW.minusSeconds(30));
        atOthersStop.setRouteStop(othersStop);
        when(records.findByTrip_IdOrderByOccurredAtAsc(trip.getId())).thenReturn(List.of(check, atOthersStop));

        TripViewResponse view = service.customerTrip(job.getCode(), customer);

        // The other job's delivery is a stop on the way: its time and that the trailer got there, not the place.
        assertEquals(1, view.stops().size());
        assertEquals("ON_THE_WAY", view.stops().getFirst().kind());
        assertEquals("A stop on the way", view.stops().getFirst().name());
        assertEquals(TripRecordKind.ARRIVED_AT_STOP, view.stops().getFirst().latestStatus());
        assertNull(view.stops().getFirst().jobCode());
        assertNull(view.stops().getFirst().details());
        assertTrue(view.shared());
        assertEquals(1, view.records().size());
        assertEquals(
                List.of(shadowfax.getId()),
                view.records().getFirst().conditions().stream()
                        .map(c -> c.horseId())
                        .toList());
        assertEquals(
                List.of("Shadowfax"), view.horses().stream().map(h -> h.name()).toList());
    }

    @Test
    @DisplayName("The escort's cab is per trailer: their trailer's horses, every stop, and whose delivery each is")
    void theEscortSeesTheirTrailer() {
        departed();
        TransportJob other = sharedWith();
        deliveryOf(other);
        TripVehicle second = trailer(2, "TX-512");
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        when(loads.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of(loaded(trailer, shadowfax), loaded(second, nightfall)));
        when(records.findByTrip_IdOrderByOccurredAtAsc(trip.getId())).thenReturn(List.of());

        TripViewResponse view = service.escortTrip(job.getCode(), escort);

        assertEquals(
                List.of("Shadowfax"), view.horses().stream().map(h -> h.name()).toList());
        assertEquals("TX-447", view.vehicleCode());
        assertEquals("CBRT-2026-042", view.stops().getFirst().jobCode());
        assertEquals("Chao Phraya Racing Stables", view.stops().getFirst().name());
        assertTrue(view.shared());
    }

    @Test
    @DisplayName("The escort's list has one row per trip, naming every job it carries")
    void theEscortListsTrips() {
        when(crew.findTripRowsByUserId(eq(escort.getId()), any()))
                .thenReturn(List.of(
                        new TripSummaryResponse(
                                "CBRT-2026-041", TripStatus.DEPARTED, "HCM", "BKK", NOW, "TRP-2026-001"),
                        new TripSummaryResponse(
                                "CBRT-2026-042", TripStatus.DEPARTED, "HCM", "BKK", NOW, "TRP-2026-001"),
                        new TripSummaryResponse(
                                "CBRT-2026-050", TripStatus.NOT_STARTED, "HCM", "PNH", null, "TRP-2026-007")));

        Page<TripSummaryResponse> page = service.escortTrips(escort, PageRequest.of(0, 20));

        assertEquals(2, page.getTotalElements());
        TripSummaryResponse shared = page.getContent().getFirst();
        assertEquals("TRP-2026-001", shared.tripCode());
        assertEquals("CBRT-2026-041", shared.jobCode());
        assertEquals(List.of("CBRT-2026-041", "CBRT-2026-042"), shared.jobCodes());
        assertEquals(List.of("CBRT-2026-050"), page.getContent().get(1).jobCodes());
    }

    @Test
    @DisplayName("The office board shows each trip's leg and last checkpoint, with who recorded it from where")
    void theBoardShowsWhereEachTripIs() {
        departed();
        RouteStop pickup = namedStop(1, RouteStopKind.PICKUP, "Hồ Chí Minh City");
        RouteStop border = namedStop(2, RouteStopKind.BORDER, "Mộc Bài");
        RouteStop delivery = namedStop(3, RouteStopKind.DELIVERY, "Phnom Penh");
        RoutePlan plan = new RoutePlan();
        plan.setStops(new ArrayList<>(List.of(pickup, border, delivery)));
        when(routes.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(plan));
        TripRecord left = stored(TripRecordKind.DEPARTED, NOW.minus(Duration.ofHours(3)));
        left.setRouteStop(pickup);
        left.setRecordedBy(escort);
        left.setChannel(Channel.CAB_TABLET);
        TripRecord cleared = stored(TripRecordKind.CLEARED_BORDER, NOW.minus(Duration.ofHours(1)));
        cleared.setRouteStop(border);
        cleared.setRecordedBy(coordinator);
        cleared.setChannel(Channel.WEB);
        TripRecord check = stored(TripRecordKind.CONDITION_CHECK, NOW);
        when(records.findByTrip_IdOrderByOccurredAtAsc(trip.getId())).thenReturn(List.of(left, cleared, check));
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        when(jobs.findActiveTrips(any()))
                .thenReturn(new PageImpl<>(
                        List.of(new TripSummaryResponse(job.getCode(), TripStatus.DEPARTED, "HCM", "PNH", NOW))));

        TripSummaryResponse.Progress progress = service.coordinatorTrips(PageRequest.of(0, 20))
                .getContent()
                .getFirst()
                .progress();

        assertEquals("TRP-2026-001", progress.tripCode());
        assertEquals("Mộc Bài", progress.legFrom());
        assertEquals("Phnom Penh", progress.legTo());
        assertEquals(TripRecordKind.CLEARED_BORDER, progress.lastKind());
        assertEquals("Mộc Bài", progress.lastStop());
        assertEquals(NOW.minus(Duration.ofHours(1)), progress.lastAt());
        assertEquals(Channel.WEB, progress.lastChannel());
    }

    @Test
    @DisplayName("A departure recorded without its stop puts the trip on its first leg")
    void aDepartureWithoutAStopIsTheFirstLeg() {
        departed();
        RouteStop pickup = namedStop(1, RouteStopKind.PICKUP, "Hồ Chí Minh City");
        RouteStop border = namedStop(2, RouteStopKind.BORDER, "Mộc Bài");
        RoutePlan plan = new RoutePlan();
        plan.setStops(new ArrayList<>(List.of(pickup, border)));
        when(routes.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(plan));
        when(records.findByTrip_IdOrderByOccurredAtAsc(trip.getId()))
                .thenReturn(List.of(stored(TripRecordKind.DEPARTED, NOW.minus(Duration.ofHours(1)))));
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        when(jobs.findActiveTrips(any()))
                .thenReturn(new PageImpl<>(
                        List.of(new TripSummaryResponse(job.getCode(), TripStatus.DEPARTED, "HCM", "PNH", NOW))));

        TripSummaryResponse.Progress progress = service.coordinatorTrips(PageRequest.of(0, 20))
                .getContent()
                .getFirst()
                .progress();

        assertEquals("Hồ Chí Minh City", progress.legFrom());
        assertEquals("Mộc Bài", progress.legTo());
        assertNull(progress.lastStop());
    }

    private static RouteStop namedStop(int seq, RouteStopKind kind, String name) {
        RouteStop stop = new RouteStop();
        stop.setId(UUID.randomUUID());
        stop.setSeq((short) seq);
        stop.setKind(kind);
        Place place = new Place();
        place.setName(name);
        stop.setPlace(place);
        return stop;
    }

    @Test
    @DisplayName("On a shared flight the customer sees their own waybill and stall positions, staff every job's")
    void theCustomerSeesTheirOwnConsignment() {
        TransportJob other = sharedWith();
        Club club = new Club();
        club.setId(UUID.randomUUID());
        job.getRequest().setClub(club);
        User customer = new User();
        customer.setClub(club);
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        RouteLeg air = new RouteLeg();
        air.setId(UUID.randomUUID());
        air.setSeq((short) 2);
        air.setMode(TransportMode.AIR);
        RoutePlan plan = new RoutePlan();
        plan.setLegs(new ArrayList<>(List.of(air)));
        when(routes.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.of(plan));
        Flight flight = new Flight();
        flight.setAirline("Cathay Cargo");
        flight.setFlightNo("CX766");
        for (TransportJob owner : List.of(job, other)) {
            FlightAllocation a = new FlightAllocation();
            a.setFlight(flight);
            a.setJob(owner);
            a.setAirWaybill(owner == job ? "160-12345675" : "160-87654321");
            a.setStallPositions((short) 1);
            flight.getAllocations().add(a);
        }
        when(flightsByLeg.findByRouteLegId(air.getId())).thenReturn(Optional.of(flight));

        TripViewResponse mine = service.customerTrip(job.getCode(), customer);
        TripViewResponse office = service.coordinatorTrip(job.getCode());

        assertEquals("CX766", mine.flights().getFirst().flightNo());
        assertEquals(
                List.of("160-12345675"),
                mine.flights().getFirst().consignments().stream()
                        .map(c -> c.airWaybill())
                        .toList());
        assertEquals(2, office.flights().getFirst().consignments().size());
    }

    // ---------- a job split across trips (US-F5-06) ----------

    /** The job departed on the trip; an incident moved some horses to {@code later}, signed off or not. */
    private Trip splitOnto(Instant laterSignedOff) {
        departed();
        Trip later = new Trip();
        later.setId(UUID.randomUUID());
        later.setCode("TRP-2026-009");
        TripJob moving = new TripJob();
        moving.setTrip(trip);
        moving.setJob(job);
        moving.setStatus(TripStatus.DEPARTED);
        moving.setDepartedAt(job.getDepartedAt());
        TripJob waiting = new TripJob();
        waiting.setTrip(later);
        waiting.setJob(job);
        waiting.setSignedOffAt(laterSignedOff);
        doReturn(List.of(moving, waiting)).when(jobTrips).partsOf(job);
        doReturn(List.of(moving, waiting)).when(jobTrips).activePartsOf(job);
        doReturn(waiting).when(jobTrips).partOf(later, job);
        doReturn(moving).when(jobTrips).partOf(trip, job);
        return later;
    }

    @Test
    @DisplayName("The crew of a job's new part see and record that part, not the trip it left")
    void eachPartHasItsOwnCrew() {
        Trip later = splitOnto(NOW.minus(Duration.ofHours(1)));
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        when(crew.existsByTrip_IdAndUser_Id(trip.getId(), escort.getId())).thenReturn(false);
        when(crew.existsByTrip_IdAndUser_Id(later.getId(), escort.getId())).thenReturn(true);
        when(crew.findByTrip_IdAndUser_Id(later.getId(), escort.getId())).thenReturn(List.of(seat(trailer)));
        when(routes.findByTrip_IdAndStatus(any(), eq(RoutePlanStatus.CONFIRMED)))
                .thenReturn(Optional.empty());
        when(loads.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(any())).thenReturn(List.of());

        service.escortTrip(job.getCode(), escort);
        service.addEscortRecord(job.getCode(), escort, request(TripRecordKind.NOTE, NOW, null));

        ArgumentCaptor<TripRecord> saved = ArgumentCaptor.forClass(TripRecord.class);
        verify(records).save(saved.capture());
        assertEquals(later, saved.getValue().getTrip());
    }

    @Test
    @DisplayName("A job's new part needs its own sign-off to depart, though the job left long ago")
    void aNewPartNeedsItsOwnSignOff() {
        Trip later = splitOnto(null);
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        when(records.findTopByTrip_IdAndKindInOrderByOccurredAtDesc(eq(later.getId()), anyCollection()))
                .thenReturn(Optional.empty());

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.addCoordinatorRecord(
                        job.getCode(), coordinator, request(TripRecordKind.DEPARTED, NOW, null), later.getId()));

        assertEquals("SIGN_OFF_REQUIRED", ex.getCode());
    }

    @Test
    @DisplayName("A record moves the job's part, and the job's own status is summed up from its parts")
    void recordsMoveTheParts() {
        TripJob part = jobTrips.partOf(trip, job);

        record(TripRecordKind.DEPARTED, NOW);

        assertEquals(TripStatus.DEPARTED, part.getStatus());
        assertEquals(NOW, part.getDepartedAt());
        verify(jobTrips).summarize(job);
    }

    @Test
    @DisplayName("Staff see the trip's TRP code; the customer never does")
    void onlyStaffSeeTheTripCode() {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        job.getRequest().setClub(club);
        User customer = new User();
        customer.setClub(club);
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));

        assertEquals("TRP-2026-001", service.coordinatorTrip(job.getCode()).tripCode());
        assertNull(service.customerTrip(job.getCode(), customer).tripCode());
    }

    @Test
    @DisplayName("Handover needs the receiver's name")
    void handoverNeedsTheReceiver() {
        delivered();

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.addCoordinatorRecord(job.getCode(), coordinator, handover(NOW, "  ")));
        assertEquals("RECEIVER_REQUIRED", ex.getCode());
        verify(records, never()).save(any());
    }

    @Test
    @DisplayName("Handover keeps who received the horses and when the customer must confirm")
    void handoverCompletesTheHandoverRow() {
        delivered();
        Handover open = new Handover();
        open.setJob(job);
        open.setDeliveredAt(NOW.minus(Duration.ofMinutes(30)));
        when(handovers.findByJob_Id(job.getId())).thenReturn(Optional.of(open));

        service.addCoordinatorRecord(job.getCode(), coordinator, handover(NOW, " Sophea, receiving groom "));

        assertEquals("Sophea, receiving groom", open.getReceivingName());
        assertEquals(NOW.plus(Duration.ofDays(2)), open.getConfirmDueAt());
        assertEquals(NOW.minus(Duration.ofMinutes(30)), open.getDeliveredAt());
        assertEquals(NOW, open.getHandedOverAt());
        assertTrue(open.isReceiverConfirmed());
        ArgumentCaptor<TripRecord> saved = ArgumentCaptor.forClass(TripRecord.class);
        verify(records).save(saved.capture());
        assertEquals(saved.getValue(), open.getHandoverRecord());
        assertEquals("Passport and two head collars", saved.getValue().getText());
        assertEquals(1, saved.getValue().getConditionLogs().size());
        assertEquals(shadowfax, saved.getValue().getConditionLogs().getFirst().getHorse());
    }

    @Test
    @DisplayName("The receiver confirms the handover on the tablet")
    void handoverNeedsTheReceiversConfirmation() {
        delivered();

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.addCoordinatorRecord(
                        job.getCode(),
                        coordinator,
                        handover(NOW, "Sophea", false, List.of(condition(shadowfax, List.of())))));
        assertEquals("RECEIVER_CONFIRMATION_REQUIRED", ex.getCode());
        verify(records, never()).save(any());
    }

    @Test
    @DisplayName("Every horse handed over has its condition recorded, and only the job's own horses")
    void handoverRecordsEachHorse() {
        delivered();

        BusinessException missing = assertThrows(
                BusinessException.class,
                () -> service.addCoordinatorRecord(job.getCode(), coordinator, handover(NOW, "Sophea", true, null)));
        assertEquals("HANDOVER_CONDITION_REQUIRED", missing.getCode());
        assertEquals("Record the condition of every horse handed over; missing: Shadowfax", missing.getMessage());

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.addCoordinatorRecord(
                        job.getCode(),
                        coordinator,
                        handover(
                                NOW,
                                "Sophea",
                                true,
                                List.of(condition(shadowfax, List.of()), condition(nightfall, List.of())))));
        verify(records, never()).save(any());
    }

    // ---------- audit ----------

    @Test
    @DisplayName("Each record is audited through AuditService, in words and with the device's time")
    void recordIsAuditedInWords() {
        record(TripRecordKind.DEPARTED, NOW.minusSeconds(30));

        verify(audit)
                .recordFromDevice(
                        eq(coordinator),
                        eq(Channel.WEB),
                        eq(NOW.minusSeconds(30)),
                        eq("TRIP_RECORD_RECORDED"),
                        eq("Departed recorded for CBRT-2026-041"),
                        eq("TRIP_RECORD"),
                        any(),
                        eq(job.getCode()),
                        argThat(after -> "DEPARTED".equals(after.get("kind")) && after.containsKey("routeStopId")));
    }

    private void delivered() {
        departed();
        job.setTripStatus(TripStatus.DELIVERED);
        job.setStage(JobStage.HANDOVER);
        job.setDeliveredAt(NOW.minus(Duration.ofMinutes(30)));
        when(records.existsByTrip_IdAndKind(trip.getId(), TripRecordKind.HANDED_OVER))
                .thenReturn(false);
        TripHorse delivered = rider(job, shadowfax);
        delivered.setStatus(TripHorseStatus.DELIVERED);
        when(jobTrips.horsesEverOn(trip)).thenReturn(List.of(delivered));
    }

    private void record(TripRecordKind kind, Instant at) {
        service.addCoordinatorRecord(job.getCode(), coordinator, request(kind, at, null));
    }

    private void departed() {
        job.setTripStatus(TripStatus.DEPARTED);
        job.setStage(JobStage.TRIP);
        job.setDepartedAt(NOW.minus(Duration.ofHours(6)));
    }

    private void stubHorses() {
        List<TripHorse> onTrip = new ArrayList<>();
        for (Horse horse : List.of(shadowfax, nightfall)) {
            TripHorse th = new TripHorse();
            th.setTrip(trip);
            th.setJob(job);
            th.setHorse(horse);
            onTrip.add(th);
        }
        when(jobTrips.horsesOn(trip)).thenReturn(onTrip);
    }

    private TripRecord stored(TripRecordKind kind, Instant at) {
        TripRecord record = new TripRecord();
        record.setTrip(trip);
        record.setKind(kind);
        record.setOccurredAt(at);
        return record;
    }

    // ---------- escort sign-off gate (US-F3-08) ----------

    @Test
    @DisplayName("Escort cannot open or record a trip before manager sign-off when not started")
    void escortAccess_refusedBeforeSignOffWhenNotStarted() {
        job.setSignedOffAt(null);
        job.setTripStatus(TripStatus.NOT_STARTED);
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));

        assertThrows(ResourceNotFoundException.class, () -> service.escortTrip(job.getCode(), escort));
        assertThrows(
                ResourceNotFoundException.class,
                () -> service.addEscortRecord(job.getCode(), escort, request(TripRecordKind.NOTE, NOW, null)));
    }

    @Test
    @DisplayName("Escort can open and record on a signed-off trip")
    void escortAccess_allowedAfterSignOff() {
        job.setSignedOffAt(NOW.minus(Duration.ofHours(1)));
        job.setTripStatus(TripStatus.NOT_STARTED);
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        when(routes.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.empty());
        when(loads.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of());
        when(crew.findByTrip_Id(trip.getId())).thenReturn(List.of());

        assertDoesNotThrow(() -> service.escortTrip(job.getCode(), escort));
        assertDoesNotThrow(
                () -> service.addEscortRecord(job.getCode(), escort, request(TripRecordKind.NOTE, NOW, null)));
    }

    @Test
    @DisplayName("Escort retains access mid-trip even if a plan change cleared signedOffAt")
    void escortAccess_allowedMidTripEvenIfSignedOffAtNull() {
        job.setSignedOffAt(null);
        departed();
        when(jobs.findByCode(job.getCode())).thenReturn(Optional.of(job));
        when(routes.findByTrip_IdAndStatus(trip.getId(), RoutePlanStatus.CONFIRMED))
                .thenReturn(Optional.empty());
        when(loads.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of());
        when(crew.findByTrip_Id(trip.getId())).thenReturn(List.of());

        assertDoesNotThrow(() -> service.escortTrip(job.getCode(), escort));
        assertDoesNotThrow(
                () -> service.addEscortRecord(job.getCode(), escort, request(TripRecordKind.NOTE, NOW, null)));
    }
}
