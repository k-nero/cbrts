package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.*;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.*;
import com.equifreight.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ClearanceService {

    private final ChecklistItemRepository checklistItemRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final TransportJobRepository transportJobRepository;
    private final StoredFileRepository storedFileRepository;
    private final QuarantinePeriodRepository quarantinePeriodRepository;
    private final ValidityEngine validityEngine;

    public ClearanceService(
            ChecklistItemRepository checklistItemRepository,
            DocumentVersionRepository documentVersionRepository,
            TransportJobRepository transportJobRepository,
            StoredFileRepository storedFileRepository,
            QuarantinePeriodRepository quarantinePeriodRepository,
            ValidityEngine validityEngine) {
        this.checklistItemRepository = checklistItemRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.transportJobRepository = transportJobRepository;
        this.storedFileRepository = storedFileRepository;
        this.quarantinePeriodRepository = quarantinePeriodRepository;
        this.validityEngine = validityEngine;
    }

    /** Lấy toàn bộ danh sách checklist hồ sơ của một chuyến đi. */
    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> getChecklist(UUID jobId) {
        findJobOrThrow(jobId);
        return checklistItemRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toItemResponse)
                .toList();
    }

    /** Lấy danh sách các tài liệu đang chờ chuyên viên kiểm duyệt (PENDING inbox). */
    @Transactional(readOnly = true)
    public List<DocumentVersionResponse> getPendingReviews() {
        return documentVersionRepository.findAllByReview(DocumentReview.PENDING).stream()
                .map(ClearanceMapper::toVersionResponse)
                .toList();
    }

    /** Khách hàng hoặc Chuyên viên tải lên một phiên bản tài liệu mới (Append-only). */
    @Transactional
    public ChecklistItemResponse uploadDocumentVersion(UUID checklistItemId, DocumentUploadRequest request, User uploader) {
        ChecklistItem item = findChecklistItemOrThrow(checklistItemId);
        StoredFile file = storedFileRepository.findById(request.getFileId())
                .orElseThrow(() -> ResourceNotFoundException.of("File", request.getFileId()));

        short nextVersionNo = (short) (documentVersionRepository.findMaxVersionNoByChecklistItemId(checklistItemId)
                .orElse((short) 0) + 1);

        DocumentVersion version = new DocumentVersion();
        version.setChecklistItem(item);
        version.setVersionNo(nextVersionNo);
        version.setFile(file);
        version.setIssuedOn(request.getIssuedOn());
        version.setSampledOn(request.getSampledOn());
        version.setValidUntil(request.getValidUntil());
        version.setIssuer(request.getIssuer());
        version.setUploadedBy(uploader);
        version.setUploadedAt(Instant.now());
        version.setReview(DocumentReview.PENDING);

        DocumentVersion savedVersion = documentVersionRepository.save(version);

        item.setCurrentVersion(savedVersion);
        item.setStatus(ChecklistStatus.IN_REVIEW);
        item.setHolder(ChecklistHolder.SPECIALIST);

        // Chạy kiểm tra tính hợp lệ tự động (BR-F2-02)
        ValidityEngine.Result valResult = validityEngine.evaluate(item, savedVersion, item.getJob());
        item.setValidity(valResult.validity());
        item.setValidityNote(valResult.note());
        item.setEvaluatedAt(Instant.now());

        checklistItemRepository.save(item);
        return ClearanceMapper.toItemResponse(item);
    }

    /** Chuyên viên thủ tục & kiểm dịch duyệt tài liệu (BR-F2-04, BR-F2-05, BR-F2-07). */
    @Transactional
    public DocumentVersionResponse reviewDocument(UUID documentVersionId, ReviewDocumentRequest request, User reviewer) {
        // BR-F2-04: Bắt buộc người duyệt phải có quyền TRANSPORT_SPECIALIST
        boolean isSpecialist = reviewer.getRoles() != null && reviewer.getRoles().stream()
                .map(Role::getName)
                .anyMatch(name -> RoleName.TRANSPORT_SPECIALIST.equals(name) || RoleName.LOGISTICS_MANAGER.equals(name));
        if (!isSpecialist) {
            throw new BusinessException("Chỉ Chuyên viên thủ tục (Transport Specialist) mới có quyền duyệt tài liệu.");
        }

        DocumentVersion version = documentVersionRepository.findById(documentVersionId)
                .orElseThrow(() -> ResourceNotFoundException.of("DocumentVersion", documentVersionId));

        // BR-F2-05: Tính bất biến (Append-only) - Chỉ được phép duyệt bản đang PENDING
        if (version.getReview() != DocumentReview.PENDING) {
            throw new BusinessException("Tài liệu này đã được thẩm định trước đó. Không thể thay đổi quyết định.");
        }

        // BR-F2-07: Bắt buộc có lý do khi từ chối
        if (request.getReview() == DocumentReview.REJECTED) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new BusinessException("Vui lòng cung cấp lý do từ chối để thông báo cho khách hàng.");
            }
        }

        version.setReview(request.getReview());
        version.setReviewedBy(reviewer);
        version.setReviewedAt(Instant.now());
        version.setRejectReason(request.getRejectReason());
        DocumentVersion updatedVersion = documentVersionRepository.save(version);

        // Cập nhật trạng thái ChecklistItem
        ChecklistItem item = version.getChecklistItem();
        if (request.getReview() == DocumentReview.APPROVED) {
            if (item.getValidity() == Validity.RED) {
                throw new BusinessException("Không thể duyệt phê duyệt tài liệu vi phạm quy tắc ngày tháng (Validity đang ở mức RED).");
            }
            item.setStatus(ChecklistStatus.CLEARED);
            item.setHolder(null);
        } else {
            item.setStatus(ChecklistStatus.REJECTED);
            item.setHolder(ChecklistHolder.CUSTOMER);
        }
        checklistItemRepository.save(item);

        // Tự động kiểm tra cổng Clearance Gate sau khi duyệt
        evaluateClearanceGate(item.getJob().getId());

        return ClearanceMapper.toVersionResponse(updatedVersion);
    }

    /** Kiểm tra và kích hoạt cổng thông quan (BR-F2-03 Clearance Gate). */
    @Transactional
    public ClearanceStatusResponse evaluateClearanceGate(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        List<ChecklistItem> items = checklistItemRepository.findByJobId(jobId);
        List<QuarantinePeriod> quarantines = quarantinePeriodRepository.findByJobId(jobId);

        List<String> outstandingIssues = new ArrayList<>();

        int totalMandatory = 0;
        int clearedMandatory = 0;

        for (ChecklistItem item : items) {
            boolean isMandatory = item.getRegulationRule() == null || item.getRegulationRule().isMandatory();
            if (isMandatory) {
                totalMandatory++;
                if (item.getStatus() == ChecklistStatus.CLEARED && item.getValidity() == Validity.GREEN) {
                    clearedMandatory++;
                } else {
                    String docName = item.getDocumentType() != null ? item.getDocumentType().getName() : "Tài liệu";
                    String horseInfo = item.getHorse() != null ? " (Ngựa: " + item.getHorse().getName() + ")" : "";
                    outstandingIssues.add(String.format("%s%s chưa đạt chuẩn (Trạng thái: %s, Tính hợp lệ: %s)",
                            docName, horseInfo, item.getStatus(), item.getValidity()));
                }
            }
        }

        boolean allQuarantinesCompleted = true;
        int completedQuarantines = 0;
        for (QuarantinePeriod q : quarantines) {
            if (q.getCompletedAt() != null) {
                completedQuarantines++;
            } else {
                allQuarantinesCompleted = false;
                outstandingIssues.add("Đợt cách ly kiểm dịch chưa hoàn thành (bắt đầu " + q.getStartsOn() + " đến " + q.getEndsOn() + ")");
            }
        }

        boolean ready = (totalMandatory > 0 && clearedMandatory == totalMandatory) && allQuarantinesCompleted;

        if (ready) {
            job.setDossierStatus(DossierStatus.CLEARANCE_READY);
            job.setClearanceReadyAt(Instant.now());
            job.setStage(JobStage.CLEARANCE);
            transportJobRepository.save(job);
        } else if (job.getDossierStatus() == DossierStatus.CLEARANCE_READY) {
            // Nếu có giấy tờ bị hết hạn hoặc thêm vào làm mất chuẩn, đóng cổng lại
            job.setDossierStatus(DossierStatus.OPEN);
            job.setClearanceReadyAt(null);
            transportJobRepository.save(job);
        }

        return ClearanceStatusResponse.builder()
                .jobId(job.getId())
                .jobCode(job.getCode())
                .dossierStatus(job.getDossierStatus())
                .clearanceReady(job.getDossierStatus() == DossierStatus.CLEARANCE_READY)
                .clearanceReadyAt(job.getClearanceReadyAt())
                .totalChecklistItems(items.size())
                .mandatoryItems(totalMandatory)
                .clearedMandatoryItems(clearedMandatory)
                .totalQuarantines(quarantines.size())
                .completedQuarantines(completedQuarantines)
                .allQuarantinesCompleted(allQuarantinesCompleted)
                .outstandingIssues(outstandingIssues)
                .build();
    }

    /** Lấy trạng thái hiện tại của Clearance Gate mà không kích hoạt thay đổi. */
    @Transactional(readOnly = true)
    public ClearanceStatusResponse getClearanceStatus(UUID jobId) {
        TransportJob job = findJobOrThrow(jobId);
        List<ChecklistItem> items = checklistItemRepository.findByJobId(jobId);
        List<QuarantinePeriod> quarantines = quarantinePeriodRepository.findByJobId(jobId);

        List<String> outstandingIssues = new ArrayList<>();
        int totalMandatory = 0;
        int clearedMandatory = 0;

        for (ChecklistItem item : items) {
            boolean isMandatory = item.getRegulationRule() == null || item.getRegulationRule().isMandatory();
            if (isMandatory) {
                totalMandatory++;
                if (item.getStatus() == ChecklistStatus.CLEARED && item.getValidity() == Validity.GREEN) {
                    clearedMandatory++;
                } else {
                    String docName = item.getDocumentType() != null ? item.getDocumentType().getName() : "Tài liệu";
                    String horseInfo = item.getHorse() != null ? " (Ngựa: " + item.getHorse().getName() + ")" : "";
                    outstandingIssues.add(String.format("%s%s: %s (Hợp lệ: %s)",
                            docName, horseInfo, item.getStatus(), item.getValidity()));
                }
            }
        }

        boolean allQuarantinesCompleted = true;
        int completedQuarantines = 0;
        for (QuarantinePeriod q : quarantines) {
            if (q.getCompletedAt() != null) {
                completedQuarantines++;
            } else {
                allQuarantinesCompleted = false;
                outstandingIssues.add("Đợt cách ly chưa hoàn tất: " + q.getStartsOn() + " đến " + q.getEndsOn());
            }
        }

        return ClearanceStatusResponse.builder()
                .jobId(job.getId())
                .jobCode(job.getCode())
                .dossierStatus(job.getDossierStatus())
                .clearanceReady(job.getDossierStatus() == DossierStatus.CLEARANCE_READY)
                .clearanceReadyAt(job.getClearanceReadyAt())
                .totalChecklistItems(items.size())
                .mandatoryItems(totalMandatory)
                .clearedMandatoryItems(clearedMandatory)
                .totalQuarantines(quarantines.size())
                .completedQuarantines(completedQuarantines)
                .allQuarantinesCompleted(allQuarantinesCompleted)
                .outstandingIssues(outstandingIssues)
                .build();
    }

    private TransportJob findJobOrThrow(UUID jobId) {
        return transportJobRepository.findById(jobId)
                .orElseThrow(() -> ResourceNotFoundException.of("TransportJob", jobId));
    }

    private ChecklistItem findChecklistItemOrThrow(UUID checklistItemId) {
        return checklistItemRepository.findById(checklistItemId)
                .orElseThrow(() -> ResourceNotFoundException.of("ChecklistItem", checklistItemId));
    }
}
