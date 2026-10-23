package com.equifreight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.ChecklistStatus;
import com.equifreight.entity.enums.DocumentCategory;
import com.equifreight.entity.enums.Validity;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.job.BiosecurityWarningResponse;
import com.equifreight.repository.*;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/** US-F3-12: biosecurity warnings for horses of different jobs sharing a trailer. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BiosecurityServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-23T03:00:00Z");

    @Mock
    private JobTripService jobTrips;

    @Mock
    private LoadPlanRepository loadPlans;

    @Mock
    private LoadPlanStallRepository placements;

    @Mock
    private ChecklistItemRepository checklist;

    @Mock
    private QuarantinePeriodRepository quarantine;

    @Mock
    private TripWarningAcceptanceRepository acceptances;

    @Mock
    private AuditService audit;

    private BiosecurityService service;

    private final Trip trip = new Trip();
    private final TransportJob a = job("CBRT-2026-041");
    private final TransportJob b = job("CBRT-2026-047");
    private final Horse silverBell = horse("Silver Bell");
    private final Horse copperKing = horse("Copper King");
    private final Horse ivoryBay = horse("Ivory Bay");
    private final DocumentType eia = type("EIA (Coggins) test result", DocumentCategory.HEALTH);
    private final DocumentType piro = type("Equine piroplasmosis test result", DocumentCategory.HEALTH);
    private final DocumentType passport = type("Equine passport", DocumentCategory.IDENTITY);
    private final List<TripHorse> onTrip = new ArrayList<>();
    private final List<TripWarningAcceptance> accepted = new ArrayList<>();

    private static TransportJob job(String code) {
        TransportJob job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode(code);
        job.setRequest(new TransportRequest());
        return job;
    }

    private static Horse horse(String name) {
        Horse horse = new Horse();
        horse.setId(UUID.randomUUID());
        horse.setName(name);
        return horse;
    }

    private static DocumentType type(String name, DocumentCategory category) {
        DocumentType type = new DocumentType();
        type.setId(UUID.randomUUID());
        type.setName(name);
        type.setCategory(category);
        return type;
    }

    private void ride(TransportJob job, Horse horse) {
        TripHorse th = new TripHorse();
        th.setTrip(trip);
        th.setJob(job);
        th.setHorse(horse);
        onTrip.add(th);
    }

    private ChecklistItem item(TransportJob job, DocumentType type, Horse horse, ChecklistStatus status, Validity v) {
        ChecklistItem item = new ChecklistItem();
        item.setId(UUID.randomUUID());
        item.setJob(job);
        item.setDocumentType(type);
        item.setHorse(horse);
        item.setStatus(status);
        item.setValidity(v);
        return item;
    }

    private void isolated(TransportJob job, Horse horse, String place, LocalDate ends) {
        Place p = new Place();
        p.setName(place);
        QuarantinePeriod q = new QuarantinePeriod();
        q.setJob(job);
        q.setHorse(horse);
        q.setPlace(p);
        q.setStartsOn(ends.minusDays(14));
        q.setEndsOn(ends);
        List<QuarantinePeriod> all = new ArrayList<>(quarantine.findByJobId(job.getId()));
        all.add(q);
        when(quarantine.findByJobId(job.getId())).thenReturn(all);
    }

    private List<BiosecurityWarningResponse> kind(List<BiosecurityWarningResponse> warnings, String kind) {
        return warnings.stream().filter(w -> w.kind().equals(kind)).toList();
    }

    @BeforeEach
    void setUp() {
        trip.setId(UUID.randomUUID());
        trip.setCode("TRP-2026-004");
        ride(a, silverBell);
        ride(a, copperKing);
        ride(b, ivoryBay);
        when(jobTrips.horsesOn(trip)).thenReturn(onTrip);
        when(loadPlans.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of());
        when(quarantine.findByJobId(any())).thenReturn(List.of());
        when(checklist.findByJobId(any())).thenReturn(List.of());
        when(acceptances.findByTrip_Id(trip.getId())).thenReturn(accepted);
        when(acceptances.save(any())).thenAnswer(i -> {
            accepted.add(i.getArgument(0));
            return i.getArgument(0);
        });
        service = new BiosecurityService(
                jobTrips,
                loadPlans,
                placements,
                checklist,
                quarantine,
                acceptances,
                audit,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    @DisplayName("Isolated horses sharing with horses that weren't isolated are named, with the reason")
    void isolationMismatch() {
        isolated(a, null, "Phú Thọ", LocalDate.of(2026, 10, 16));

        List<BiosecurityWarningResponse> warnings = kind(service.forTrip(trip), "ISOLATION");

        assertThat(warnings).hasSize(1);
        assertEquals(
                "TRP-2026-004: Silver Bell and Copper King (CBRT-2026-041) isolated at Phú Thọ until 16 Oct; "
                        + "CBRT-2026-047's horses weren't isolated. Sharing a trailer ends that isolation.",
                warnings.getFirst().message());
        assertThat(warnings.getFirst().jobCodes()).containsExactly("CBRT-2026-041", "CBRT-2026-047");
        assertThat(warnings.getFirst().horses()).containsExactlyInAnyOrder("Silver Bell", "Copper King", "Ivory Bay");
    }

    @Test
    @DisplayName("Horses isolated together in the same place and period don't warn")
    void sameIsolationGroup() {
        isolated(a, null, "Phú Thọ", LocalDate.of(2026, 10, 16));
        isolated(b, null, "Phú Thọ", LocalDate.of(2026, 10, 16));

        assertThat(kind(service.forTrip(trip), "ISOLATION")).isEmpty();
    }

    @Test
    @DisplayName("A job alone on its trip has nothing to compare")
    void aJobAloneHasNoWarnings() {
        onTrip.removeIf(th -> th.getJob() == b);
        isolated(a, null, "Phú Thọ", LocalDate.of(2026, 10, 16));

        assertThat(service.forTrip(trip)).isEmpty();
    }

    @Test
    @DisplayName("Jobs requiring different health tests warn that the other job's horses weren't tested")
    void differentHealthTests() {
        when(checklist.findByJobId(a.getId()))
                .thenReturn(List.of(
                        item(a, eia, silverBell, ChecklistStatus.CLEARED, Validity.GREEN),
                        item(a, piro, silverBell, ChecklistStatus.CLEARED, Validity.GREEN),
                        item(a, passport, silverBell, ChecklistStatus.AWAITING_UPLOAD, null)));
        when(checklist.findByJobId(b.getId()))
                .thenReturn(List.of(item(b, eia, ivoryBay, ChecklistStatus.CLEARED, Validity.GREEN)));

        List<BiosecurityWarningResponse> warnings = service.forTrip(trip);

        assertThat(kind(warnings, "HEALTH_TESTS"))
                .singleElement()
                .satisfies(w -> assertEquals(
                        "CBRT-2026-041 needs Equine piroplasmosis test result; CBRT-2026-047's rules don't, so its horses may not have been tested or certified for it.",
                        w.message()));
        // The passport isn't a health document, so it raises nothing.
        assertThat(kind(warnings, "HEALTH_DOCUMENTS")).isEmpty();
    }

    @Test
    @DisplayName("A health document of a horse on the trailer that isn't cleared and green warns, naming the horse")
    void healthDocumentNotClear() {
        when(checklist.findByJobId(a.getId()))
                .thenReturn(List.of(item(a, eia, silverBell, ChecklistStatus.CLEARED, Validity.GREEN)));
        when(checklist.findByJobId(b.getId()))
                .thenReturn(List.of(item(b, eia, ivoryBay, ChecklistStatus.AWAITING_UPLOAD, null)));

        assertThat(kind(service.forTrip(trip), "HEALTH_DOCUMENTS"))
                .singleElement()
                .satisfies(w -> assertEquals(
                        "CBRT-2026-047: health documents not yet clear for departure: EIA (Coggins) test result for"
                                + " Ivory Bay (awaiting upload).",
                        w.message()));
    }

    @Test
    @DisplayName("Accepting records who accepted it; an accepted warning isn't asked again")
    void acceptedWarningsAreRecorded() {
        isolated(a, null, "Phú Thọ", LocalDate.of(2026, 10, 16));
        List<BiosecurityWarningResponse> warnings = service.forTrip(trip);
        User khoi = new User();
        String key = warnings.getFirst().key();

        ConflictException refused =
                assertThrows(ConflictException.class, () -> service.requireAccepted(trip, warnings, List.of(), khoi));
        assertEquals("BIOSECURITY_WARNINGS", refused.getCode());
        assertThat(refused.getDetails()).containsExactly(warnings.getFirst().message());

        service.requireAccepted(trip, warnings, List.of(key), khoi);
        verify(acceptances).save(argThatAccepted(key, khoi));
        verify(audit)
                .recordDecision(
                        eq(khoi),
                        eq("ACCEPT_BIOSECURITY_WARNING"),
                        any(),
                        eq("TRIP"),
                        eq(trip.getId()),
                        eq("TRP-2026-004"),
                        any(),
                        any(),
                        eq("ISOLATION"));

        // Unchanged, it is shown as accepted and not asked again.
        assertThat(service.forTrip(trip).getFirst().accepted()).isTrue();
        service.requireAccepted(trip, service.forTrip(trip), List.of(), khoi);
    }

    @Test
    @DisplayName("A document that changed since the warning was accepted raises it again at confirmation")
    void aChangedWarningIsAskedAgain() {
        ChecklistItem flu = item(b, eia, ivoryBay, ChecklistStatus.CLEARED, Validity.AMBER);
        when(checklist.findByJobId(b.getId())).thenReturn(List.of(flu));
        List<BiosecurityWarningResponse> before = kind(service.forTrip(trip), "HEALTH_DOCUMENTS");
        service.requireAccepted(trip, before, List.of(before.getFirst().key()), new User());

        flu.setValidity(Validity.RED);
        List<BiosecurityWarningResponse> after = kind(service.forTrip(trip), "HEALTH_DOCUMENTS");

        assertThat(after.getFirst().key()).isNotEqualTo(before.getFirst().key());
        assertThat(after.getFirst().accepted()).isFalse();
        assertThrows(ConflictException.class, () -> service.requireAccepted(trip, after, List.of(), new User()));
    }

    @Test
    @DisplayName("In a convoy only horses on the same trailer are compared")
    void onlyTheSameTrailer() {
        isolated(a, null, "Phú Thọ", LocalDate.of(2026, 10, 16));
        LoadPlan first = new LoadPlan();
        first.setId(UUID.randomUUID());
        LoadPlan second = new LoadPlan();
        second.setId(UUID.randomUUID());
        when(loadPlans.findByTripVehicle_Trip_IdOrderByTripVehicle_Seq(trip.getId()))
                .thenReturn(List.of(first, second));
        when(placements.findByLoadPlanId(first.getId()))
                .thenReturn(List.of(placed(first, silverBell), placed(first, copperKing)));
        when(placements.findByLoadPlanId(second.getId())).thenReturn(List.of(placed(second, ivoryBay)));

        assertThat(service.forTrip(trip)).isEmpty();

        when(placements.findByLoadPlanId(second.getId()))
                .thenReturn(List.of(placed(second, ivoryBay), placed(second, copperKing)));
        when(placements.findByLoadPlanId(first.getId())).thenReturn(List.of(placed(first, silverBell)));
        assertThat(kind(service.forTrip(trip), "ISOLATION"))
                .singleElement()
                .satisfies(w -> assertThat(w.horses()).containsExactlyInAnyOrder("Ivory Bay", "Copper King"));
    }

    private static LoadPlanStall placed(LoadPlan plan, Horse horse) {
        LoadPlanStall lps = new LoadPlanStall();
        lps.setLoadPlan(plan);
        lps.setHorse(horse);
        return lps;
    }

    private static TripWarningAcceptance argThatAccepted(String key, User user) {
        return org.mockito.ArgumentMatchers.argThat(a -> a.getWarningKey().equals(key)
                && a.getAcceptedBy() == user
                && a.getAcceptedAt().equals(NOW));
    }
}
