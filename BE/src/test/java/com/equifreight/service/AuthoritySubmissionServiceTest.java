package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.SubmissionKind;
import com.equifreight.entity.enums.SubmissionStatus;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.clearance.CreateAuthoritySubmissionRequest;
import com.equifreight.model.clearance.UpdateAuthoritySubmissionRequest;
import com.equifreight.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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

        CreateAuthoritySubmissionRequest request = new CreateAuthoritySubmissionRequest();
        request.setAuthorityId(customs.getId());
        request.setKind(SubmissionKind.IMPORT_PERMIT);

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

        CreateAuthoritySubmissionRequest request = new CreateAuthoritySubmissionRequest();
        request.setAuthorityId(customs.getId());
        request.setKind(SubmissionKind.IMPORT_PERMIT);
        request.setChecklistItemIds(List.of(foreign.getId()));

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

        UpdateAuthoritySubmissionRequest request = new UpdateAuthoritySubmissionRequest();
        request.setStatus(SubmissionStatus.ADDITIONAL_INFO);

        service.updateSubmission(submission.getId(), request, specialist);

        assertEquals(DossierStatus.CLEARANCE_READY, job.getDossierStatus(), "the service must not set it directly");
        verify(transportJobRepository, never()).save(any());
        verify(clearanceService).evaluateClearanceGate(job.getId());
    }
}
