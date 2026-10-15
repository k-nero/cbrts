package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.model.clearance.ClearanceStatusResponse;
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
        specialistUser.setEmail("specialist@equifreight.vn");
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

        checklistItem = new ChecklistItem();
        checklistItem.setId(UUID.randomUUID());
        checklistItem.setJob(job);
        checklistItem.setStatus(ChecklistStatus.IN_REVIEW);
        checklistItem.setValidity(Validity.GREEN);

        documentVersion = new DocumentVersion();
        documentVersion.setId(UUID.randomUUID());
        documentVersion.setChecklistItem(checklistItem);
        documentVersion.setReview(DocumentReview.PENDING);
        documentVersion.setVersionNo((short) 1);
    }

    @Test
    @DisplayName("BR-F2-04: Chỉ Transport Specialist mới có quyền duyệt tài liệu")
    void nonSpecialistCannotReviewDocument() {
        ReviewDocumentRequest request = ReviewDocumentRequest.builder()
                .review(DocumentReview.APPROVED)
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                clearanceService.reviewDocument(documentVersion.getId(), request, customerUser));

        assertTrue(ex.getMessage().contains("Chỉ Chuyên viên thủ tục"));
    }

    @Test
    @DisplayName("BR-F2-05: Append-only - Không được sửa tài liệu đã duyệt")
    void cannotReviewNonPendingVersion() {
        documentVersion.setReview(DocumentReview.APPROVED); // Đã duyệt rồi
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));

        ReviewDocumentRequest request = ReviewDocumentRequest.builder()
                .review(DocumentReview.APPROVED)
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                clearanceService.reviewDocument(documentVersion.getId(), request, specialistUser));

        assertTrue(ex.getMessage().contains("Tài liệu này đã được thẩm định"));
    }

    @Test
    @DisplayName("BR-F2-07: Từ chối bắt buộc phải có lý do (rejectReason)")
    void rejectRequiresReason() {
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));

        ReviewDocumentRequest request = ReviewDocumentRequest.builder()
                .review(DocumentReview.REJECTED)
                .rejectReason("") // Rỗng
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                clearanceService.reviewDocument(documentVersion.getId(), request, specialistUser));

        assertTrue(ex.getMessage().contains("Vui lòng cung cấp lý do từ chối"));
    }

    @Test
    @DisplayName("Duyệt tài liệu hợp lệ -> ChecklistItem chuyển sang CLEARED")
    void approveValidDocumentClearsChecklistItem() {
        when(documentVersionRepository.findById(documentVersion.getId())).thenReturn(Optional.of(documentVersion));
        when(documentVersionRepository.save(any(DocumentVersion.class))).thenAnswer(i -> i.getArgument(0));
        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());

        ReviewDocumentRequest request = ReviewDocumentRequest.builder()
                .review(DocumentReview.APPROVED)
                .build();

        clearanceService.reviewDocument(documentVersion.getId(), request, specialistUser);

        assertEquals(DocumentReview.APPROVED, documentVersion.getReview());
        assertEquals(ChecklistStatus.CLEARED, checklistItem.getStatus());
        assertNull(checklistItem.getHolder());
        verify(checklistItemRepository).save(checklistItem);
    }

    @Test
    @DisplayName("BR-F2-03: Clearance Gate mở khi mọi giấy tờ đạt chuẩn GREEN và cách ly hoàn tất")
    void clearanceGateOpensWhenAllMandatoryItemsClearedAndQuarantineDone() {
        checklistItem.setStatus(ChecklistStatus.CLEARED);
        checklistItem.setValidity(Validity.GREEN);

        QuarantinePeriod quarantine = new QuarantinePeriod();
        quarantine.setCompletedAt(Instant.now()); // Đã xong cách ly

        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of(quarantine));

        ClearanceStatusResponse response = clearanceService.evaluateClearanceGate(job.getId());

        assertTrue(response.isClearanceReady());
        assertEquals(DossierStatus.CLEARANCE_READY, job.getDossierStatus());
        assertNotNull(job.getClearanceReadyAt());
        verify(transportJobRepository).save(job);
    }

    @Test
    @DisplayName("Clearance Gate chặn xuất phát nếu còn giấy tờ chưa đạt chuẩn")
    void clearanceGateBlocksWhenItemsNotCleared() {
        checklistItem.setStatus(ChecklistStatus.IN_REVIEW); // Chưa duyệt xong

        when(transportJobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(checklistItemRepository.findByJobId(job.getId())).thenReturn(List.of(checklistItem));
        when(quarantinePeriodRepository.findByJobId(job.getId())).thenReturn(List.of());

        ClearanceStatusResponse response = clearanceService.evaluateClearanceGate(job.getId());

        assertFalse(response.isClearanceReady());
        assertEquals(DossierStatus.OPEN, job.getDossierStatus());
        assertFalse(response.getOutstandingIssues().isEmpty());
    }
}
