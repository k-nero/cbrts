package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
import com.equifreight.repository.*;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
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
    private JobTripService jobTrips;

    private TripService service;

    private Trip trip;

    private User coordinator;
    private User escort;
    private TransportJob job;
    private Horse shadowfax;
    private Horse nightfall;

    private static TripRecordRequest request(TripRecordKind kind, Instant at, List<TripConditionRequest> conditions) {
        return new TripRecordRequest(null, kind, at, UUID.randomUUID(), null, conditions, null);
    }

    private static TripRecordRequest handover(Instant at, String receiverName) {
        return new TripRecordRequest(null, TripRecordKind.HANDED_OVER, at, UUID.randomUUID(), null, null, receiverName);
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
                jobTrips,
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

        shadowfax = horse("Shadowfax");
        nightfall = horse("Nightfall");

        when(jobs.findByCodeForUpdate(job.getCode())).thenReturn(Optional.of(job));
        when(records.findByClientRef(any())).thenReturn(Optional.empty());
        when(records.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(records.findTopByTrip_IdAndKindInOrderByOccurredAtDesc(eq(trip.getId()), anyCollection()))
                .thenReturn(Optional.empty());
        when(crew.existsByTripVehicle_Trip_IdAndUser_Id(trip.getId(), escort.getId()))
                .thenReturn(true);
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
                        null, TripRecordKind.HELD, NOW, UUID.randomUUID(), "Vet check at the border", null, null));

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
        for (Horse horse : List.of(shadowfax, nightfall)) {
            RequestHorse rh = new RequestHorse();
            rh.setHorse(horse);
            when(requestHorses.findByRequest_IdAndHorse_Id(job.getRequest().getId(), horse.getId()))
                    .thenReturn(Optional.of(rh));
        }
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
        when(crew.findByTripVehicle_Trip_Id(trip.getId())).thenReturn(List.of());

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
        when(crew.findByTripVehicle_Trip_Id(trip.getId())).thenReturn(List.of());

        assertDoesNotThrow(() -> service.escortTrip(job.getCode(), escort));
        assertDoesNotThrow(
                () -> service.addEscortRecord(job.getCode(), escort, request(TripRecordKind.NOTE, NOW, null)));
    }
}
