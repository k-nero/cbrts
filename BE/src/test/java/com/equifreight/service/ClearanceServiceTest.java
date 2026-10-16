package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.model.clearance.ClearanceStatusResponse;
import com.equifreight.model.clearance.DocumentUploadRequest;
import com.equifreight.model.clearance.ReviewDocumentRequest;
import com.equifreight.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClearanceServiceTest {

    @Mock
    private ChecklistItemRepository checklistItemRepository;
    @Mock
    private DocumentVersionRepository documentVersionRepository;
    @Mock
    private TransportJobRepository transportJobRepository;
    @Mock
    private QuarantinePeriodRepository quarantinePeriodRepository;
    @Mock
    private AuthoritySubmissionRepository authoritySubmissionRepository;
    @Mock
    private ValidityEngine validityEngine;
    @Mock
    private AuditService auditService;
    @Mock
    private FileService fileService;

    @InjectMocks
    private ClearanceService clearanceService;

    private User specialistUser;
    private TransportJob job;
    private ChecklistItem checklistItem;
    private DocumentVersion documentVersion;

    @BeforeEach
    void setUp() {
        Role specialistRole = new Role();
        specialistRole.setName(RoleName.TRANSPORT_SPECIALIST);

        specialistUser = new User();
        specialistUser.setId(UUID.randomUUID());
        specialistUser.setFirstName("Lan");
        specialistUser.setLastName("Nguyen");
        specialistUser.setEmail("lan.nguyen@equifreight.vn");
        specialistUser.setRoles(Set.of(specialistRole));

        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-001");
        job.setDossierStatus(DossierStatus.OPEN);
        job.setStage(JobStage.DOCUMENTS);

        DocumentType docType = new DocumentType();
        docType.setId(UUID.randomUUID());
        docType.setCode("EQUINE_PASSPORT");
        docType.setName("Equine passport");

        checklistItem = new ChecklistItem();
        checklistItem.setId(UUID.randomUUID());
        checklistItem.setJob(job);
        checklistItem.setDocumentType(docType);
        checklistItem.setStatus(ChecklistStatus.IN_REVIEW);
        checklistItem.setValidity(Validity.GREEN);

        documentVersion = new DocumentVersion();
        documentVersion.setId(UUID.randomUUID());
        documentVersion.setChecklistItem(checklistItem);
        documentVersion.setVersionNo((short) 1);
        documentVersion.setReview(DocumentReview.PENDING);

        checklistItem.setCurrentVersion(documentVersion);
    }

    @Test
    @DisplayName("reviewDocument rejects re-reviewing an already reviewed version")
    void reviewDocumentThrowsWhenNotPending() {
        documentVersion.setReview(DocumentReview.APPROVED);
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));

        ReviewDocumentRequest req = new ReviewDocumentRequest();
        req.setReview(DocumentReview.REJECTED);
        req.setRejectReason("Sample is blurred");

        assertThrows(ConflictException.class, () ->
                clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument rejects when reviewing a superseded version (Finding 3)")
    void reviewDocumentThrowsWhenVersionIsSuperseded() {
        DocumentVersion v2 = new DocumentVersion();
        v2.setId(UUID.randomUUID());
        v2.setVersionNo((short) 2);
        checklistItem.setCurrentVersion(v2);

        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));

        ReviewDocumentRequest req = new ReviewDocumentRequest();
        req.setReview(DocumentReview.APPROVED);

        ConflictException ex = assertThrows(ConflictException.class, () ->
                clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        assertEquals("VERSION_SUPERSEDED", ex.getCode());
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument rejects invalid review decisions like PENDING (Finding 6)")
    void reviewDocumentThrowsWhenReviewDecisionIsPending() {
        ReviewDocumentRequest req = new ReviewDocumentRequest();
        req.setReview(DocumentReview.PENDING);

        assertThrows(BusinessException.class, () ->
                clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument requires a rejection reason when rejecting a version")
    void reviewDocumentThrowsWhenRejectionReasonMissing() {
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));

        ReviewDocumentRequest req = new ReviewDocumentRequest();
        req.setReview(DocumentReview.REJECTED);
        req.setRejectReason("   ");

        assertThrows(BusinessException.class, () ->
                clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument refuses approval when validity is RED before writing to database")
    void reviewDocumentRefusesApprovalWhenValidityIsRed() {
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));
        when(validityEngine.evaluate(any(), any(), any()))
                .thenReturn(new ValidityEngine.Result(Validity.RED, "Sampling date expired 65 days before departure."));

        ReviewDocumentRequest req = new ReviewDocumentRequest();
        req.setReview(DocumentReview.APPROVED);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser));
        assertTrue(ex.getMessage().contains("RED cannot be approved"));
        verify(documentVersionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reviewDocument approves version, marks item CLEARED, and audits decision")
    void reviewDocumentApprovesSuccessfully() {
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));
        when(documentVersionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(checklistItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(validityEngine.evaluate(any(), any(), any()))
                .thenReturn(new ValidityEngine.Result(Validity.GREEN, "Valid document."));

        ReviewDocumentRequest req = new ReviewDocumentRequest();
        req.setReview(DocumentReview.APPROVED);

        clearanceService.reviewDocument(documentVersion.getId(), req, specialistUser);

        assertEquals(DocumentReview.APPROVED, documentVersion.getReview());
        assertEquals(specialistUser, documentVersion.getReviewedBy());
        assertEquals(ChecklistStatus.CLEARED, checklistItem.getStatus());
        assertNull(checklistItem.getHolder());

        verify(auditService).recordDecision(
                eq(specialistUser),
                eq("DOCUMENT_APPROVED"),
                contains("Approved Equine passport"),
                eq("DOCUMENT_VERSION"),
                eq(documentVersion.getId()),
                eq(job.getCode()),
                isNull(),
                eq("PENDING"),
                eq("APPROVED"));
    }

    @Test
    @DisplayName("uploadDocumentVersion refuses RED validity before saving anything (Finding 8)")
    void uploadDocumentVersionRefusesRedBeforeSave() {
        UUID fileId = UUID.randomUUID();
        StoredFile file = new StoredFile();
        file.setId(fileId);

        when(checklistItemRepository.findById(checklistItem.getId())).thenReturn(Optional.of(checklistItem));
        when(fileService.requireAttachable(fileId, specialistUser)).thenReturn(file);
        when(validityEngine.evaluate(any(), any(), any()))
                .thenReturn(new ValidityEngine.Result(Validity.RED, "Booster vaccination out of window."));

        DocumentUploadRequest req = DocumentUploadRequest.builder()
                .fileId(fileId)
                .issuedOn(LocalDate.of(2026, 1, 1))
                .validUntil(LocalDate.of(2026, 2, 1))
                .issuer("DAH Vietnam")
                .build();

        ConflictException ex = assertThrows(ConflictException.class, () ->
                clearanceService.uploadDocumentVersion(checklistItem.getId(), req, specialistUser));
        assertEquals("DOCUMENT_VALIDITY_RED", ex.getCode());
        verify(documentVersionRepository, never()).save(any());
        verify(auditService, never()).recordDecision(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("evaluateClearanceGate opens gate when all mandatory items are CLEARED, GREEN, and submissions ISSUED")
    void evaluateClearanceGateReadyWhenAllCleared() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);

        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of());

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertTrue(resp.isClearanceReady());
        assertEquals(DossierStatus.CLEARANCE_READY, resp.getDossierStatus());
        assertEquals(JobStage.CLEARANCE, job.getStage());
        assertNotNull(job.getClearanceReadyAt());

        verify(transportJobRepository).save(job);
        verify(auditService).recordDecision(
                isNull(),
                eq("CLEARANCE_GATE_PASSED"),
                contains("CLEARANCE_READY"),
                eq("TRANSPORT_JOB"),
                eq(job.getId()),
                eq(job.getCode()),
                isNull(),
                eq("OPEN"),
                eq("CLEARANCE_READY"));
    }

    @Test
    @DisplayName("evaluateClearanceGate refuses gate when authority submission is REFUSED (Finding 5)")
    void evaluateClearanceGateBlocksWhenSubmissionRefused() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);

        Authority authority = new Authority();
        authority.setName("Customs Department");

        AuthoritySubmission refused = new AuthoritySubmission();
        refused.setAuthority(authority);
        refused.setKind(SubmissionKind.IMPORT_PERMIT);
        refused.setStatus(SubmissionStatus.REFUSED);

        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of(refused));

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertFalse(resp.isClearanceReady());
        assertNotEquals(DossierStatus.CLEARANCE_READY, resp.getDossierStatus());
        assertTrue(resp.getOutstandingIssues().stream().anyMatch(i -> i.contains("refused by Customs Department")));
    }

    @Test
    @DisplayName("evaluateClearanceGate does not mutate job after departure (Finding 2)")
    void evaluateClearanceGateReturnsEarlyAfterDeparture() {
        job.setDepartedAt(Instant.now());
        job.setDossierStatus(DossierStatus.CLEARANCE_READY);
        job.setStage(JobStage.TRIP);

        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(List.of());

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertEquals(JobStage.TRIP, job.getStage());
        verify(transportJobRepository, never()).save(any());
        verify(auditService, never()).recordDecision(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("evaluateClearanceGate passes when a refused filing was re-filed and issued (latest per authority and kind)")
    void evaluateClearanceGateCountsOnlyTheLatestSubmission() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);
        Authority customs = authority("Cambodia customs");

        stubGate(List.of(
                submission(customs, SubmissionStatus.REFUSED, Instant.parse("2026-10-01T02:00:00Z")),
                submission(customs, SubmissionStatus.ISSUED, Instant.parse("2026-10-03T02:00:00Z"))));

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertTrue(resp.isClearanceReady());
        assertEquals(DossierStatus.CLEARANCE_READY, job.getDossierStatus());
    }

    @Test
    @DisplayName("evaluateClearanceGate blocks when the latest filing was refused after an earlier one was issued")
    void evaluateClearanceGateBlocksWhenTheLatestSubmissionIsRefused() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);
        Authority customs = authority("Cambodia customs");

        stubGate(List.of(
                submission(customs, SubmissionStatus.ISSUED, Instant.parse("2026-10-01T02:00:00Z")),
                submission(customs, SubmissionStatus.REFUSED, Instant.parse("2026-10-03T02:00:00Z"))));

        ClearanceStatusResponse resp = clearanceService.evaluateClearanceGate(job.getId());

        assertFalse(resp.isClearanceReady());
        assertEquals(DossierStatus.OPEN, job.getDossierStatus());
    }

    @Test
    @DisplayName("evaluateClearanceGate derives ADDITIONAL_INFO_REQUIRED from an open info request")
    void evaluateClearanceGateSetsAdditionalInfoRequired() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);

        stubGate(List.of(submission(authority("DAH Vietnam"), SubmissionStatus.ADDITIONAL_INFO, Instant.parse("2026-10-02T02:00:00Z"))));

        clearanceService.evaluateClearanceGate(job.getId());

        assertEquals(DossierStatus.ADDITIONAL_INFO_REQUIRED, job.getDossierStatus());
        assertNull(job.getClearanceReadyAt());
    }

    private void stubGate(List<AuthoritySubmission> submissions) {
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());
        when(authoritySubmissionRepository.findByJobId(job.getId())).thenReturn(submissions);
    }

    private static Authority authority(String name) {
        Authority authority = new Authority();
        authority.setId(UUID.randomUUID());
        authority.setName(name);
        return authority;
    }

    private static AuthoritySubmission submission(Authority authority, SubmissionStatus status, Instant filedAt) {
        AuthoritySubmission submission = new AuthoritySubmission();
        submission.setId(UUID.randomUUID());
        submission.setAuthority(authority);
        submission.setKind(SubmissionKind.IMPORT_PERMIT);
        submission.setStatus(status);
        submission.setFiledAt(filedAt);
        return submission;
    }
}
