package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.NotificationKind;
import com.equifreight.entity.enums.PlaceKind;
import com.equifreight.entity.enums.QuarantineKind;
import com.equifreight.entity.enums.SubmissionKind;
import com.equifreight.entity.enums.SubmissionStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.clearance.CreateAuthoritySubmissionRequest;
import com.equifreight.model.clearance.CreateQuarantinePeriodRequest;
import com.equifreight.model.clearance.UpdateAuthoritySubmissionRequest;
import com.equifreight.repository.*;
import com.equifreight.service.notification.Audience;
import com.equifreight.service.notification.Subject;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthoritySubmissionServiceTest {

    @Mock
    private AuthorityRepository authorityRepository;

    @Mock
    private AuthoritySubmissionRepository submissionRepository;

    @Mock
    private QuarantinePeriodRepository quarantinePeriodRepository;

    @Mock
    private TransportJobRepository transportJobRepository;

    @Mock
    private ChecklistItemRepository checklistItemRepository;

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private HorseRepository horseRepository;

    @Mock
    private FileService fileService;

    @Mock
    private AuditService auditService;

    @Mock
    private ClearanceService clearanceService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private QuarantineNotices quarantineNotices;

    // Only its rules on a quarantine's kind are used here, never its repository.
    @Spy
    private QuarantineRules quarantineRules = new QuarantineRules(null);

    @InjectMocks
    private AuthoritySubmissionService service;

    private User specialist;
    private TransportJob job;
    private Authority customs;

    @BeforeEach
    void setUp() {
        specialist = new User();
        specialist.setId(UUID.randomUUID());
        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-041");
        job.setDossierStatus(DossierStatus.CLEARANCE_READY);
        customs = new Authority();
        customs.setId(UUID.randomUUID());
        customs.setName("Cambodia customs");
    }

    @Test
    @DisplayName("Filing a submission leaves the dossier status to the clearance gate")
    void createSubmissionLetsTheGateSetTheDossierStatus() {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(authorityRepository.findById(customs.getId())).thenReturn(Optional.of(customs));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateAuthoritySubmissionRequest request = CreateAuthoritySubmissionRequest.builder()
                .authorityId(customs.getId())
                .kind(SubmissionKind.IMPORT_PERMIT)
                .build();

        service.createSubmission(job.getId(), request, specialist);

        assertEquals(DossierStatus.CLEARANCE_READY, job.getDossierStatus(), "the service must not set it directly");
        verify(transportJobRepository, never()).save(any());
        verify(clearanceService).evaluateClearanceGate(job.getId());
    }

    @Test
    @DisplayName("Filing refuses checklist items from another job")
    void createSubmissionRefusesChecklistItemsFromAnotherJob() {
        TransportJob other = new TransportJob();
        other.setId(UUID.randomUUID());
        ChecklistItem foreign = new ChecklistItem();
        foreign.setId(UUID.randomUUID());
        foreign.setJob(other);
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(authorityRepository.findById(customs.getId())).thenReturn(Optional.of(customs));
        when(checklistItemRepository.findById(foreign.getId())).thenReturn(Optional.of(foreign));

        CreateAuthoritySubmissionRequest request = CreateAuthoritySubmissionRequest.builder()
                .authorityId(customs.getId())
                .kind(SubmissionKind.IMPORT_PERMIT)
                .checklistItemIds(List.of(foreign.getId()))
                .build();

        assertThrows(ConflictException.class, () -> service.createSubmission(job.getId(), request, specialist));
        verify(submissionRepository, never()).save(any());
    }

    @Test
    @DisplayName("An info request goes through the gate instead of writing the dossier status")
    void additionalInfoLetsTheGateSetTheDossierStatus() {
        AuthoritySubmission submission = new AuthoritySubmission();
        submission.setId(UUID.randomUUID());
        submission.setJob(job);
        submission.setAuthority(customs);
        submission.setKind(SubmissionKind.IMPORT_PERMIT);
        submission.setStatus(SubmissionStatus.FILED);
        submission.setFiledAt(Instant.now());
        when(submissionRepository.findById(submission.getId())).thenReturn(Optional.of(submission));
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateAuthoritySubmissionRequest request = UpdateAuthoritySubmissionRequest.builder()
                .status(SubmissionStatus.ADDITIONAL_INFO)
                .build();

        service.updateSubmission(submission.getId(), request, specialist);

        assertEquals(DossierStatus.CLEARANCE_READY, job.getDossierStatus(), "the service must not set it directly");
        verify(transportJobRepository, never()).save(any());
        verify(clearanceService).evaluateClearanceGate(job.getId());
    }

    @Test
    @DisplayName("A quarantine shorter than the destination catalog's minimum is refused")
    void quarantineShorterThanTheDestinationMinimumIsRefused() {
        RegulationCatalog catalog = new RegulationCatalog();
        catalog.setName("Cambodia import");
        RegulationVersion destination = new RegulationVersion();
        destination.setCatalog(catalog);
        destination.setQuarantineMinDays((short) 7);
        Place station = station();
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(placeRepository.findById(station.getId())).thenReturn(Optional.of(station));
        when(clearanceService.destinationVersion(job.getId())).thenReturn(Optional.of(destination));

        LocalDate start = LocalDate.of(2026, 10, 20);
        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.createQuarantine(
                        job.getId(),
                        new CreateQuarantinePeriodRequest(null, station.getId(), start, start.plusDays(5), null),
                        specialist));
        assertEquals("QUARANTINE_TOO_SHORT", ex.getCode());
        verify(quarantineRules).minimumDays(QuarantineKind.PRE_EXPORT, destination);
        verify(quarantinePeriodRepository, never()).save(any());
    }

    @Test
    @DisplayName("Late submissions alert the manager who approved the job; one with no approver is skipped")
    void alertLateSubmissionsNotifiesTheApprovingManager() {
        User manager = new User();
        manager.setId(UUID.randomUUID());
        job.setApprovedBy(manager);
        AuthoritySubmission late = new AuthoritySubmission();
        late.setId(UUID.randomUUID());
        late.setJob(job);
        late.setAuthority(customs);
        late.setKind(SubmissionKind.IMPORT_PERMIT);
        late.setStatus(SubmissionStatus.FILED);
        late.setExpectedBy(LocalDate.of(2026, 10, 20));
        TransportJob unapproved = new TransportJob();
        unapproved.setCode("CBRT-2026-042");
        AuthoritySubmission orphan = new AuthoritySubmission();
        orphan.setJob(unapproved);
        orphan.setAuthority(customs);
        LocalDate today = LocalDate.of(2026, 10, 21);
        when(submissionRepository.findByStatusInAndExpectedByBefore(
                        List.of(SubmissionStatus.FILED, SubmissionStatus.ADDITIONAL_INFO), today))
                .thenReturn(List.of(late, orphan));

        assertEquals(1, service.alertLateSubmissions(today));

        verify(notificationService)
                .notify(
                        eq(NotificationKind.DOSSIER_LATE),
                        eq(Audience.staff(manager)),
                        eq(Subject.authoritySubmission(late)),
                        any(),
                        any(),
                        eq("DOSSIER_LATE:" + late.getId()));
        verifyNoMoreInteractions(notificationService);
    }

    private static Place station() {
        Place station = new Place();
        station.setId(UUID.randomUUID());
        station.setName("Đại Nam isolation barn");
        station.setKind(PlaceKind.QUARANTINE);
        return station;
    }

    private QuarantinePeriod scheduled(Place station) {
        QuarantinePeriod quarantine = new QuarantinePeriod();
        quarantine.setId(UUID.randomUUID());
        quarantine.setJob(job);
        quarantine.setPlace(station);
        quarantine.setStartsOn(LocalDate.of(2026, 11, 20));
        quarantine.setEndsOn(LocalDate.of(2026, 11, 27));
        when(quarantinePeriodRepository.findById(quarantine.getId())).thenReturn(Optional.of(quarantine));
        return quarantine;
    }

    @Test
    @DisplayName("A quarantine can't be completed before its last day (US-F3-22)")
    void aQuarantineIsNotCompletedBeforeItsEnd() {
        QuarantinePeriod quarantine = scheduled(station());

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.completeQuarantine(quarantine.getId(), specialist, LocalDate.of(2026, 11, 26)));

        assertEquals("QUARANTINE_NOT_ENDED", ex.getCode());
        assertEquals(
                "The quarantine at Đại Nam isolation barn ends on 27 Nov; it can be completed from then.",
                ex.getMessage());
        verify(quarantinePeriodRepository, never()).save(any());
    }

    @Test
    @DisplayName("A quarantine is completed on its last day, and the clearance gate is re-run")
    void aQuarantineIsCompletedOnItsLastDay() {
        QuarantinePeriod quarantine = scheduled(station());
        when(quarantinePeriodRepository.save(quarantine)).thenReturn(quarantine);

        service.completeQuarantine(quarantine.getId(), specialist, LocalDate.of(2026, 11, 27));

        assertNotNull(quarantine.getCompletedAt());
        verify(clearanceService).evaluateClearanceGate(job.getId());
    }

    @Test
    @DisplayName("A scheduled quarantine's dates and station can be changed, and the change is audited")
    void aScheduledQuarantineCanBeChanged() {
        QuarantinePeriod quarantine = scheduled(station());
        Place other = station();
        other.setName("Phú Thọ quarantine station");
        when(placeRepository.findById(other.getId())).thenReturn(Optional.of(other));
        when(quarantinePeriodRepository.save(quarantine)).thenReturn(quarantine);

        service.updateQuarantine(
                quarantine.getId(),
                new CreateQuarantinePeriodRequest(
                        null, other.getId(), LocalDate.of(2026, 11, 21), LocalDate.of(2026, 11, 28), null),
                specialist);

        assertEquals(other, quarantine.getPlace());
        assertEquals(LocalDate.of(2026, 11, 28), quarantine.getEndsOn());
        verify(auditService)
                .recordDecision(
                        eq(specialist),
                        eq("QUARANTINE_CHANGED"),
                        any(),
                        eq("QUARANTINE_PERIOD"),
                        eq(quarantine.getId()),
                        eq("CBRT-2026-041"),
                        any(),
                        eq("Đại Nam isolation barn, 20 Nov to 27 Nov"),
                        eq("Phú Thọ quarantine station, 21 Nov to 28 Nov"));
        verify(clearanceService).evaluateClearanceGate(job.getId());
    }

    @Test
    @DisplayName("A completed quarantine can't be changed, and a quarantine is only held at a quarantine station")
    void aCompletedQuarantineOrAnotherPlaceIsRefused() {
        QuarantinePeriod done = scheduled(station());
        done.setCompletedAt(Instant.parse("2026-11-27T02:00:00Z"));
        CreateQuarantinePeriodRequest request = new CreateQuarantinePeriodRequest(
                null, done.getPlace().getId(), LocalDate.of(2026, 11, 20), LocalDate.of(2026, 11, 27), null);
        assertThrows(BusinessException.class, () -> service.updateQuarantine(done.getId(), request, specialist));

        Place stables = station();
        stables.setKind(PlaceKind.STABLE);
        stables.setName("Sha Tin Racecourse stables (HKJC)");
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(placeRepository.findById(stables.getId())).thenReturn(Optional.of(stables));
        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.createQuarantine(
                        job.getId(),
                        new CreateQuarantinePeriodRequest(
                                null, stables.getId(), LocalDate.of(2026, 11, 20), LocalDate.of(2026, 11, 27), null),
                        specialist));
        assertEquals("Sha Tin Racecourse stables (HKJC) is not a quarantine station.", ex.getMessage());
        verify(quarantinePeriodRepository, never()).save(any());
    }

    // ---------- a quarantine before export or after arrival ----------

    private static Country country(String code, String name) {
        Country c = new Country();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setName(name);
        return c;
    }

    private static final Country HONG_KONG = country("HK", "Hong Kong");
    private static final Country AUSTRALIA = country("AU", "Australia");

    /** The job moves horses from Sha Tin to Werribee, Australia. */
    private void hongKongToAustralia() {
        Place werribee = new Place();
        werribee.setCountry(AUSTRALIA);
        TransportRequest request = new TransportRequest();
        request.setDestinationPlace(werribee);
        job.setRequest(request);
    }

    private static Place stationIn(Country country, String name) {
        Place station = station();
        station.setName(name);
        station.setCountry(country);
        return station;
    }

    @Test
    @DisplayName("Australia's second quarantine is scheduled after arrival, at a station there, and doesn't hold"
            + " departure")
    void aQuarantineAfterArrivalIsScheduledWithItsKind() {
        hongKongToAustralia();
        Place mickleham = stationIn(AUSTRALIA, "Mickleham post-entry quarantine");
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(placeRepository.findById(mickleham.getId())).thenReturn(Optional.of(mickleham));
        when(quarantinePeriodRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var saved = service.createQuarantine(
                job.getId(),
                new CreateQuarantinePeriodRequest(
                        null,
                        mickleham.getId(),
                        LocalDate.of(2026, 12, 2),
                        LocalDate.of(2026, 12, 16),
                        QuarantineKind.POST_ARRIVAL),
                specialist);

        assertEquals(QuarantineKind.POST_ARRIVAL, saved.kind());
        verify(quarantinePeriodRepository)
                .save(argThat(q -> q.getKind() == QuarantineKind.POST_ARRIVAL && !quarantineRules.holdsDeparture(q)));
        verify(clearanceService).evaluateClearanceGate(job.getId());
    }

    @Test
    @DisplayName("Without a kind, a quarantine is scheduled before export, as before")
    void aQuarantineIsBeforeExportByDefault() {
        hongKongToAustralia();
        Place shaTin = stationIn(HONG_KONG, "Sha Tin isolation stables");
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(placeRepository.findById(shaTin.getId())).thenReturn(Optional.of(shaTin));
        when(quarantinePeriodRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var saved = service.createQuarantine(
                job.getId(),
                new CreateQuarantinePeriodRequest(
                        null, shaTin.getId(), LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 30), null),
                specialist);

        assertEquals(QuarantineKind.PRE_EXPORT, saved.kind());
    }

    @Test
    @DisplayName("A quarantine after arrival is held where the horses arrive, and one before export isn't")
    void aQuarantineIsHeldInTheCountryItsKindSays() {
        hongKongToAustralia();
        Place shaTin = stationIn(HONG_KONG, "Sha Tin isolation stables");
        Place mickleham = stationIn(AUSTRALIA, "Mickleham post-entry quarantine");
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(placeRepository.findById(shaTin.getId())).thenReturn(Optional.of(shaTin));
        when(placeRepository.findById(mickleham.getId())).thenReturn(Optional.of(mickleham));
        LocalDate start = LocalDate.of(2026, 12, 2);

        BusinessException afterArrival = assertThrows(
                BusinessException.class,
                () -> service.createQuarantine(
                        job.getId(),
                        new CreateQuarantinePeriodRequest(
                                null, shaTin.getId(), start, start.plusDays(14), QuarantineKind.POST_ARRIVAL),
                        specialist));
        assertEquals("QUARANTINE_WRONG_COUNTRY", afterArrival.getCode());
        assertEquals(
                "A quarantine after arrival is held in Australia, where the horses arrive; Sha Tin isolation stables"
                        + " is in Hong Kong.",
                afterArrival.getMessage());

        BusinessException beforeExport = assertThrows(
                BusinessException.class,
                () -> service.createQuarantine(
                        job.getId(),
                        new CreateQuarantinePeriodRequest(
                                null, mickleham.getId(), start, start.plusDays(14), QuarantineKind.PRE_EXPORT),
                        specialist));
        assertEquals("QUARANTINE_WRONG_COUNTRY", beforeExport.getCode());
        assertEquals(
                "A quarantine before export is held before the horses leave for Australia; Mickleham post-entry"
                        + " quarantine is in Australia. Schedule it as a quarantine after arrival.",
                beforeExport.getMessage());
        verify(quarantinePeriodRepository, never()).save(any());
    }

    @Test
    @DisplayName("Changing a quarantine keeps its kind unless the change names one")
    void aChangeKeepsTheKind() {
        hongKongToAustralia();
        Place mickleham = stationIn(AUSTRALIA, "Mickleham post-entry quarantine");
        QuarantinePeriod quarantine = scheduled(mickleham);
        quarantine.setKind(QuarantineKind.POST_ARRIVAL);
        when(placeRepository.findById(mickleham.getId())).thenReturn(Optional.of(mickleham));
        when(quarantinePeriodRepository.save(quarantine)).thenReturn(quarantine);

        service.updateQuarantine(
                quarantine.getId(),
                new CreateQuarantinePeriodRequest(
                        null, mickleham.getId(), LocalDate.of(2026, 11, 21), LocalDate.of(2026, 12, 5), null),
                specialist);

        assertEquals(QuarantineKind.POST_ARRIVAL, quarantine.getKind());
    }
}
