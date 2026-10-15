package com.equifreight.service;

import com.equifreight.entity.*;
import com.equifreight.entity.enums.AuthorityKind;
import com.equifreight.entity.enums.DossierStatus;
import com.equifreight.entity.enums.RoleName;
import com.equifreight.entity.enums.SubmissionStatus;
import com.equifreight.exception.BusinessException;
import com.equifreight.exception.ResourceNotFoundException;
import com.equifreight.model.clearance.*;
import com.equifreight.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class AuthoritySubmissionService {

    private final AuthorityRepository authorityRepository;
    private final AuthoritySubmissionRepository submissionRepository;
    private final QuarantinePeriodRepository quarantinePeriodRepository;
    private final TransportJobRepository transportJobRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final StoredFileRepository storedFileRepository;
    private final PlaceRepository placeRepository;
    private final HorseRepository horseRepository;
    private final NotificationService notificationService;
    private final ClearanceService clearanceService;

    public AuthoritySubmissionService(
            AuthorityRepository authorityRepository,
            AuthoritySubmissionRepository submissionRepository,
            QuarantinePeriodRepository quarantinePeriodRepository,
            TransportJobRepository transportJobRepository,
            ChecklistItemRepository checklistItemRepository,
            StoredFileRepository storedFileRepository,
            PlaceRepository placeRepository,
            HorseRepository horseRepository,
            NotificationService notificationService,
            ClearanceService clearanceService) {
        this.authorityRepository = authorityRepository;
        this.submissionRepository = submissionRepository;
        this.quarantinePeriodRepository = quarantinePeriodRepository;
        this.transportJobRepository = transportJobRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.storedFileRepository = storedFileRepository;
        this.placeRepository = placeRepository;
        this.horseRepository = horseRepository;
        this.notificationService = notificationService;
        this.clearanceService = clearanceService;
    }

    /** Lấy danh sách cơ quan chức năng (Bộ Nông nghiệp, Thú y, Hải quan, Kiểm dịch). */
    @Transactional(readOnly = true)
    public List<AuthorityResponse> listAuthorities(String countryCode, AuthorityKind kind) {
        List<Authority> list;
        if (countryCode != null && !countryCode.isBlank() && kind != null) {
            list = authorityRepository.findByCountryCodeAndKind(countryCode, kind);
        } else if (countryCode != null && !countryCode.isBlank()) {
            list = authorityRepository.findByCountryCode(countryCode);
        } else if (kind != null) {
            list = authorityRepository.findByKind(kind);
        } else {
            list = authorityRepository.findAll();
        }
        return list.stream().map(ClearanceMapper::toAuthorityResponse).toList();
    }

    /** Lấy tất cả đợt trình hồ sơ của một chuyến vận chuyển. */
    @Transactional(readOnly = true)
    public List<AuthoritySubmissionResponse> getSubmissionsByJob(UUID jobId) {
        findJobOrThrow(jobId);
        return submissionRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toSubmissionResponse)
                .toList();
    }

    /** Tạo một đợt nộp hồ sơ mới tới cơ quan chức năng (Export cert, Import permit, Customs dossier). */
    @Transactional
    public AuthoritySubmissionResponse createSubmission(UUID jobId, CreateAuthoritySubmissionRequest request, User specialist) {
        assertSpecialist(specialist);
        TransportJob job = findJobOrThrow(jobId);
        Authority authority = authorityRepository.findById(request.getAuthorityId())
                .orElseThrow(() -> ResourceNotFoundException.of("Authority", request.getAuthorityId()));

        AuthoritySubmission submission = new AuthoritySubmission();
        submission.setJob(job);
        submission.setAuthority(authority);
        submission.setKind(request.getKind());
        submission.setStatus(SubmissionStatus.FILED);
        submission.setFiledAt(Instant.now());
        submission.setFiledBy(specialist);
        submission.setReferenceNo(request.getReferenceNo());

        // Tính ngày dự kiến hoàn thành theo SLA nếu không truyền vào
        if (request.getExpectedBy() != null) {
            submission.setExpectedBy(request.getExpectedBy());
        } else if (authority.getSlaDays() != null) {
            submission.setExpectedBy(LocalDate.now().plusDays(authority.getSlaDays()));
        }

        // Đính kèm các checklist item vào bộ hồ sơ nộp
        if (request.getChecklistItemIds() != null && !request.getChecklistItemIds().isEmpty()) {
            Set<ChecklistItem> items = new HashSet<>(checklistItemRepository.findAllById(request.getChecklistItemIds()));
            submission.setChecklistItems(items);
        }

        AuthoritySubmission saved = submissionRepository.save(submission);

        // Cập nhật trạng thái job sang SUBMITTED_TO_AUTHORITY
        job.setDossierStatus(DossierStatus.SUBMITTED_TO_AUTHORITY);
        transportJobRepository.save(job);

        return ClearanceMapper.toSubmissionResponse(saved);
    }

    /** Cập nhật tiến độ duyệt hồ sơ từ cơ quan chức năng (FILED -> ADDITIONAL_INFO -> ISSUED / REFUSED). */
    @Transactional
    public AuthoritySubmissionResponse updateSubmission(UUID submissionId, UpdateAuthoritySubmissionRequest request, User specialist) {
        assertSpecialist(specialist);
        AuthoritySubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> ResourceNotFoundException.of("AuthoritySubmission", submissionId));

        submission.setStatus(request.getStatus());

        if (request.getReferenceNo() != null) {
            submission.setReferenceNo(request.getReferenceNo());
        }
        if (request.getExpectedBy() != null) {
            submission.setExpectedBy(request.getExpectedBy());
        }

        if (request.getStatus() == SubmissionStatus.ISSUED) {
            submission.setIssuedAt(Instant.now());
            if (request.getResultFileId() != null) {
                StoredFile resultFile = storedFileRepository.findById(request.getResultFileId())
                        .orElseThrow(() -> ResourceNotFoundException.of("File", request.getResultFileId()));
                submission.setResultFile(resultFile);
            }
        } else if (request.getStatus() == SubmissionStatus.ADDITIONAL_INFO) {
            // Cơ quan chức năng yêu cầu bổ sung hồ sơ
            TransportJob job = submission.getJob();
            job.setDossierStatus(DossierStatus.ADDITIONAL_INFO_REQUIRED);
            transportJobRepository.save(job);

            // Gửi thông báo
            if (job.getRequest() != null && job.getRequest().getCreatedBy() != null) {
                notificationService.sendNotification(
                        job.getRequest().getCreatedBy(),
                        "ADDITIONAL_INFO_REQUIRED",
                        "Yêu cầu bổ sung hồ sơ từ cơ quan " + submission.getAuthority().getName(),
                        "Cơ quan chức năng yêu cầu cung cấp thêm thông tin đối với bộ hồ sơ " + submission.getKind(),
                        "AuthoritySubmission",
                        submission.getId()
                );
            }
        }

        AuthoritySubmission updated = submissionRepository.save(submission);

        // Đánh giá lại cổng thông quan (Clearance Gate) nếu có giấy phép được cấp
        clearanceService.evaluateClearanceGate(submission.getJob().getId());

        return ClearanceMapper.toSubmissionResponse(updated);
    }

    /** Lấy danh sách đợt cách ly kiểm dịch của chuyến đi. */
    @Transactional(readOnly = true)
    public List<QuarantinePeriodResponse> listQuarantines(UUID jobId) {
        findJobOrThrow(jobId);
        return quarantinePeriodRepository.findByJobId(jobId).stream()
                .map(ClearanceMapper::toQuarantineResponse)
                .toList();
    }

    /** Thiết lập đợt cách ly kiểm dịch cho ngựa/lô ngựa. */
    @Transactional
    public QuarantinePeriodResponse createQuarantine(UUID jobId, CreateQuarantinePeriodRequest request, User specialist) {
        assertSpecialist(specialist);
        TransportJob job = findJobOrThrow(jobId);
        Place place = placeRepository.findById(request.getPlaceId())
                .orElseThrow(() -> ResourceNotFoundException.of("Place (Trạm kiểm dịch)", request.getPlaceId()));

        Horse horse = null;
        if (request.getHorseId() != null) {
            horse = horseRepository.findById(request.getHorseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Horse", request.getHorseId()));
        }

        if (request.getEndsOn().isBefore(request.getStartsOn())) {
            throw new BusinessException("Ngày kết thúc cách ly không thể trước ngày bắt đầu.");
        }

        QuarantinePeriod quarantine = new QuarantinePeriod();
        quarantine.setJob(job);
        quarantine.setHorse(horse);
        quarantine.setPlace(place);
        quarantine.setStartsOn(request.getStartsOn());
        quarantine.setEndsOn(request.getEndsOn());

        QuarantinePeriod saved = quarantinePeriodRepository.save(quarantine);
        return ClearanceMapper.toQuarantineResponse(saved);
    }

    /** Ghi nhận hoàn thành đợt cách ly kiểm dịch. */
    @Transactional
    public QuarantinePeriodResponse completeQuarantine(UUID quarantineId, User specialist) {
        assertSpecialist(specialist);
        QuarantinePeriod quarantine = quarantinePeriodRepository.findById(quarantineId)
                .orElseThrow(() -> ResourceNotFoundException.of("QuarantinePeriod", quarantineId));

        quarantine.setCompletedAt(Instant.now());
        QuarantinePeriod updated = quarantinePeriodRepository.save(quarantine);

        // Tự động kiểm tra lại Clearance Gate khi kiểm dịch hoàn thành
        clearanceService.evaluateClearanceGate(quarantine.getJob().getId());

        return ClearanceMapper.toQuarantineResponse(updated);
    }

    private void assertSpecialist(User user) {
        if (user == null || user.getRoles() == null) {
            throw new BusinessException("Yêu cầu đăng nhập.");
        }
        boolean hasPerm = user.getRoles().stream()
                .map(Role::getName)
                .anyMatch(r -> RoleName.TRANSPORT_SPECIALIST.equals(r) || RoleName.LOGISTICS_MANAGER.equals(r));
        if (!hasPerm) {
            throw new BusinessException("Chỉ Chuyên viên thủ tục hoặc Quản lý Logistics mới có quyền thực hiện.");
        }
    }

    private TransportJob findJobOrThrow(UUID jobId) {
        return transportJobRepository.findById(jobId)
                .orElseThrow(() -> ResourceNotFoundException.of("TransportJob", jobId));
    }
}
