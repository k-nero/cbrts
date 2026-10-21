package com.equifreight.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.SubmissionKind;
import com.equifreight.entity.enums.SubmissionStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.clearance.CreateAuthoritySubmissionRequest;
import com.equifreight.model.clearance.CreateQuarantinePeriodRequest;
import com.equifreight.model.clearance.UpdateAuthoritySubmissionRequest;
import com.equifreight.repository.*;
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
        Place station = new Place();
        station.setId(UUID.randomUUID());
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(placeRepository.findById(station.getId())).thenReturn(Optional.of(station));
        when(clearanceService.destinationVersion(job.getId())).thenReturn(Optional.of(destination));

        LocalDate start = LocalDate.of(2026, 10, 20);
        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> service.createQuarantine(
                        job.getId(),
                        new CreateQuarantinePeriodRequest(null, station.getId(), start, start.plusDays(5)),
                        specialist));
        assertEquals("QUARANTINE_TOO_SHORT", ex.getCode());
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
                .sendNotification(
                        eq(manager), eq("DOSSIER_LATE"), any(), any(), eq("AuthoritySubmission"), eq(late.getId()));
        verifyNoMoreInteractions(notificationService);
    }
}
