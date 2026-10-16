package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ConflictException;
import com.equifreight.exception.UnauthorizedException;
import com.equifreight.model.clearance.ClearanceStatusResponse;
import com.equifreight.model.clearance.ReviewDocumentRequest;
import com.equifreight.entity.enums.RoleName;
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
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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
    private StoredFileRepository storedFileRepository;
    @Mock
    private QuarantinePeriodRepository quarantinePeriodRepository;
    @Mock
    private ValidityEngine validityEngine;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private ClearanceService clearanceService;

    private User specialistUser;
    private User customerUser;
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

        Role customerRole = new Role();
        customerRole.setName(RoleName.CUSTOMER);

        customerUser = new User();
        customerUser.setId(UUID.randomUUID());
        customerUser.setEmail("customer@club.vn");
        customerUser.setRoles(Set.of(customerRole));

        job = new TransportJob();
        job.setId(UUID.randomUUID());
        job.setCode("CBRT-2026-001");
        job.setDossierStatus(DossierStatus.OPEN);

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
    }

    @Test
    @DisplayName("reviewDocument rejects when caller is not a Transport Specialist")
    void reviewDocumentThrowsWhenNotSpecialist() {
        ReviewDocumentRequest req = new ReviewDocumentRequest();
        req.setReview(DocumentReview.APPROVED);

        assertThrows(UnauthorizedException.class, () ->
                clearanceService.reviewDocument(documentVersion.getId(), req, customerUser));
        verify(documentVersionRepository, never()).save(any());
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
    @DisplayName("evaluateClearanceGate opens gate when all mandatory items are CLEARED and GREEN")
    void evaluateClearanceGateReadyWhenAllCleared() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);

        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());

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
}
