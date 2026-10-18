package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.trip.TripConditionRequest;
import com.equifreight.model.trip.TripRecordRequest;
import com.equifreight.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

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
    private AuditLogRepository audit;
    @InjectMocks
    private TripService service;
    private User coordinator;
    private TransportJob job;
    private Horse shadowfax;
    private Horse nightfall;

    private static TripRecordRequest request(TripRecordKind kind, Instant at, List<TripConditionRequest> conditions) {
        return new TripRecordRequest(null, kind, at, UUID.randomUUID(), null, conditions);
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

        shadowfax = horse("Shadowfax");
        nightfall = horse("Nightfall");

        when(jobs.findByCodeForUpdate(job.getCode())).thenReturn(Optional.of(job));
        when(records.findByClientRef(any())).thenReturn(Optional.empty());
        when(records.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(records.findTopByJob_IdAndKindInOrderByOccurredAtDesc(eq(job.getId()), anyCollection())).thenReturn(Optional.empty());
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

        service.addCoordinatorRecord(job.getCode(), coordinator, request(TripRecordKind.CONDITION_CHECK, NOW,
                List.of(condition(shadowfax, List.of()))));

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
        when(records.findTopByJob_IdAndKindInOrderByOccurredAtDesc(eq(job.getId()), anyCollection()))
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
        when(records.findTopByJob_IdAndKindInOrderByOccurredAtDesc(eq(job.getId()), anyCollection()))
                .thenReturn(Optional.of(stored(TripRecordKind.CLEARED_BORDER, NOW.minusSeconds(600))));

        assertThrows(ConflictException.class, () -> record(TripRecordKind.HELD, NOW.minusSeconds(1_200)));
        verify(records, never()).save(any());
    }

    @Test
    @DisplayName("A record dated in the future is refused")
    void futureRecordIsRefused() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> record(TripRecordKind.NOTE, NOW.plus(Duration.ofHours(1))));
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

        BusinessException ex = assertThrows(BusinessException.class, () -> service.addCoordinatorRecord(job.getCode(), coordinator,
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

        BusinessException ex = assertThrows(BusinessException.class, () -> service.addCoordinatorRecord(job.getCode(), coordinator,
                request(TripRecordKind.CONDITION_CHECK, NOW, List.of(condition(shadowfax, List.of(photo)), condition(nightfall, List.of(photo))))));
        assertEquals("DUPLICATE_PHOTO", ex.getCode());
        verify(records, never()).save(any());
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
            when(requestHorses.findByRequest_IdAndHorse_Id(job.getRequest().getId(), horse.getId())).thenReturn(Optional.of(rh));
        }
    }

    private TripRecord stored(TripRecordKind kind, Instant at) {
        TripRecord record = new TripRecord();
        record.setJob(job);
        record.setKind(kind);
        record.setOccurredAt(at);
        return record;
    }
}
