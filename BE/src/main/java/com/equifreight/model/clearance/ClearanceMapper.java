package com.equifreight.model.clearance;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.DocumentVersion;
import com.equifreight.entity.RegulationCatalog;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.DossierStatus;
import java.util.List;
import java.util.UUID;

public final class ClearanceMapper {

    private ClearanceMapper() {}

    /** A job on the transport specialist's picker. */
    public static JobSummaryResponse toJobSummaryResponse(TransportJob job) {
        return JobSummaryResponse.builder()
                .id(job.getId())
                .code(job.getCode())
                .dossierStatus(job.getDossierStatus())
                .stage(job.getStage())
                .clubName(job.getRequest().getClub().getName())
                .build();
    }

    /** The clearance gate of a job, with the counts ClearanceService worked out. */
    public static ClearanceStatusResponse toStatusResponse(
            TransportJob job,
            int totalChecklistItems,
            int mandatoryItems,
            int clearedMandatoryItems,
            int totalQuarantines,
            int completedQuarantines,
            List<String> outstandingIssues) {
        return ClearanceStatusResponse.builder()
                .jobId(job.getId())
                .jobCode(job.getCode())
                .dossierStatus(job.getDossierStatus())
                .clearanceReady(job.getDossierStatus() == DossierStatus.CLEARANCE_READY)
                .clearanceReadyAt(job.getClearanceReadyAt())
                .totalChecklistItems(totalChecklistItems)
                .mandatoryItems(mandatoryItems)
                .clearedMandatoryItems(clearedMandatoryItems)
                .totalQuarantines(totalQuarantines)
                .completedQuarantines(completedQuarantines)
                .allQuarantinesCompleted(completedQuarantines == totalQuarantines)
                .outstandingIssues(outstandingIssues)
                .build();
    }

    /** A country's regulation catalog; {@code activeVersion} is its latest published version, or null. */
    public static RegulationCatalogResponse toCatalogResponse(
            RegulationCatalog catalog, RegulationVersion activeVersion) {
        return RegulationCatalogResponse.builder()
                .id(catalog.getId())
                .countryCode(catalog.getCountry() != null ? catalog.getCountry().getCode() : null)
                .name(catalog.getName())
                .activeVersion(activeVersion != null ? toVersionResponse(activeVersion) : null)
                .build();
    }

    public static DocumentVersionResponse toVersionResponse(DocumentVersion version) {
        if (version == null) {
            return null;
        }

        UUID uploadedById = null;
        String uploadedByName = null;
        if (version.getUploadedBy() != null) {
            uploadedById = version.getUploadedBy().getId();
            uploadedByName = formatUserName(version.getUploadedBy());
        }

        UUID reviewedById = null;
        String reviewedByName = null;
        if (version.getReviewedBy() != null) {
            reviewedById = version.getReviewedBy().getId();
            reviewedByName = formatUserName(version.getReviewedBy());
        }

        return DocumentVersionResponse.builder()
                .id(version.getId())
                .checklistItemId(
                        version.getChecklistItem() != null
                                ? version.getChecklistItem().getId()
                                : null)
                .versionNo(version.getVersionNo())
                .fileId(version.getFile() != null ? version.getFile().getId() : null)
                .fileName(version.getFile() != null ? version.getFile().getFileName() : null)
                .contentType(version.getFile() != null ? version.getFile().getContentType() : null)
                .sizeBytes(version.getFile() != null ? version.getFile().getSizeBytes() : 0)
                .issuedOn(version.getIssuedOn())
                .sampledOn(version.getSampledOn())
                .validUntil(version.getValidUntil())
                .issuer(version.getIssuer())
                .uploadedById(uploadedById)
                .uploadedByName(uploadedByName)
                .uploadedAt(version.getUploadedAt())
                .review(version.getReview())
                .reviewedById(reviewedById)
                .reviewedByName(reviewedByName)
                .reviewedAt(version.getReviewedAt())
                .rejectReason(version.getRejectReason())
                .build();
    }

    public static ChecklistItemResponse toItemResponse(ChecklistItem item) {
        if (item == null) {
            return null;
        }

        ChecklistItemResponse.ChecklistItemResponseBuilder builder = ChecklistItemResponse.builder()
                .id(item.getId())
                .jobId(item.getJob() != null ? item.getJob().getId() : null)
                .jobCode(item.getJob() != null ? item.getJob().getCode() : null)
                .status(item.getStatus())
                .validity(item.getValidity())
                .validityNote(item.getValidityNote())
                .evaluatedAt(item.getEvaluatedAt())
                .holder(item.getHolder())
                .dueDate(item.getDueDate())
                .currentVersion(toVersionResponse(item.getCurrentVersion()))
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt());

        if (item.getDocumentType() != null) {
            builder.documentTypeId(item.getDocumentType().getId())
                    .documentTypeCode(item.getDocumentType().getCode())
                    .documentTypeName(item.getDocumentType().getName())
                    .documentScope(item.getDocumentType().getScope())
                    .providedBy(item.getDocumentType().getProvidedBy());
        }

        if (item.getRegulationRule() != null) {
            builder.regulationRuleId(item.getRegulationRule().getId())
                    .ruleKind(item.getRegulationRule().getRuleKind())
                    .mandatory(item.getRegulationRule().isMandatory())
                    .minDays(item.getRegulationRule().getMinDays())
                    .maxDays(item.getRegulationRule().getMaxDays())
                    .ruleDescription(item.getRegulationRule().getDescription());
        }

        if (item.getHorse() != null) {
            builder.horseId(item.getHorse().getId())
                    .horseName(item.getHorse().getName())
                    .horseMicrochip(item.getHorse().getMicrochip());
        }

        if (item.getBorderCrossing() != null) {
            builder.borderCrossingId(item.getBorderCrossing().getId())
                    .borderCrossingName(item.getBorderCrossing().getName());
        }

        return builder.build();
    }

    public static DocumentTypeResponse toDocumentTypeResponse(com.equifreight.entity.DocumentType dt) {
        if (dt == null) return null;
        return DocumentTypeResponse.builder()
                .id(dt.getId())
                .code(dt.getCode())
                .name(dt.getName())
                .scope(dt.getScope())
                .providedBy(dt.getProvidedBy())
                .build();
    }

    public static RegulationRuleResponse toRuleResponse(com.equifreight.entity.RegulationRule rule) {
        if (rule == null) return null;
        String param = "—";
        if (rule.getRuleKind() != null) {
            switch (rule.getRuleKind()) {
                case VALID_THROUGH_ARRIVAL_PLUS ->
                    param = rule.getMaxDays() != null ? "arrival + " + rule.getMaxDays() + " d" : "arrival";
                case BOOSTER_WINDOW ->
                    param = (rule.getMinDays() != null ? rule.getMinDays() : 0) + "–"
                            + (rule.getMaxDays() != null ? rule.getMaxDays() : 0) + " d before";
                case WINDOW_BEFORE_DEPARTURE ->
                    param = rule.getMaxDays() != null ? "within " + rule.getMaxDays() + " d" : "before departure";
                case PRESENCE_ONLY -> {
                    if (rule.getDocumentType() != null
                            && "CUSTOMS_VALUE_DECLARATION"
                                    .equals(rule.getDocumentType().getCode())) {
                        param = "1 per crossing";
                    } else {
                        param = "—";
                    }
                }
            }
        }
        return RegulationRuleResponse.builder()
                .id(rule.getId())
                .documentType(toDocumentTypeResponse(rule.getDocumentType()))
                .mandatory(rule.isMandatory())
                .ruleKind(rule.getRuleKind())
                .minDays(rule.getMinDays())
                .maxDays(rule.getMaxDays())
                .description(rule.getDescription())
                .parameterDisplay(param)
                .build();
    }

    public static RegulationVersionResponse toVersionResponse(com.equifreight.entity.RegulationVersion rv) {
        if (rv == null) return null;
        String pubName = rv.getPublishedBy() != null ? formatUserName(rv.getPublishedBy()) : null;
        return RegulationVersionResponse.builder()
                .id(rv.getId())
                .catalogId(rv.getCatalog() != null ? rv.getCatalog().getId() : null)
                .versionNo(rv.getVersionNo())
                .status(rv.getStatus())
                .publishedAt(rv.getPublishedAt())
                .publishedByName(pubName)
                .leadTimeDays(rv.getLeadTimeDays())
                .quarantineMinDays(rv.getQuarantineMinDays())
                .arrivalBufferDays(rv.getArrivalBufferDays())
                .rules(java.util.List.of())
                .build();
    }

    public static AuthorityResponse toAuthorityResponse(com.equifreight.entity.Authority auth) {
        if (auth == null) return null;
        return AuthorityResponse.builder()
                .id(auth.getId())
                .name(auth.getName())
                .countryCode(auth.getCountry() != null ? auth.getCountry().getCode() : null)
                .kind(auth.getKind())
                .slaDays(auth.getSlaDays())
                .build();
    }

    public static AuthoritySubmissionResponse toSubmissionResponse(com.equifreight.entity.AuthoritySubmission sub) {
        if (sub == null) return null;
        boolean isOverdue = sub.getExpectedBy() != null
                && sub.getStatus() != com.equifreight.entity.enums.SubmissionStatus.ISSUED
                && sub.getStatus() != com.equifreight.entity.enums.SubmissionStatus.REFUSED
                && java.time.LocalDate.now().isAfter(sub.getExpectedBy());

        java.util.List<UUID> itemIds = sub.getChecklistItems() == null
                ? java.util.List.of()
                : sub.getChecklistItems().stream().map(ChecklistItem::getId).toList();

        return AuthoritySubmissionResponse.builder()
                .id(sub.getId())
                .jobId(sub.getJob() != null ? sub.getJob().getId() : null)
                .jobCode(sub.getJob() != null ? sub.getJob().getCode() : null)
                .authority(toAuthorityResponse(sub.getAuthority()))
                .kind(sub.getKind())
                .status(sub.getStatus())
                .filedAt(sub.getFiledAt())
                .filedByName(sub.getFiledBy() != null ? formatUserName(sub.getFiledBy()) : null)
                .referenceNo(sub.getReferenceNo())
                .expectedBy(sub.getExpectedBy())
                .isOverdue(isOverdue)
                .issuedAt(sub.getIssuedAt())
                .resultFileId(sub.getResultFile() != null ? sub.getResultFile().getId() : null)
                .resultFileName(
                        sub.getResultFile() != null ? sub.getResultFile().getFileName() : null)
                .checklistItemIds(itemIds)
                .build();
    }

    public static QuarantinePeriodResponse toQuarantineResponse(com.equifreight.entity.QuarantinePeriod q) {
        if (q == null) return null;
        return QuarantinePeriodResponse.builder()
                .id(q.getId())
                .jobId(q.getJob() != null ? q.getJob().getId() : null)
                .horseId(q.getHorse() != null ? q.getHorse().getId() : null)
                .horseName(q.getHorse() != null ? q.getHorse().getName() : "Toàn bộ lô ngựa")
                .placeId(q.getPlace() != null ? q.getPlace().getId() : null)
                .placeName(q.getPlace() != null ? q.getPlace().getName() : null)
                .startsOn(q.getStartsOn())
                .endsOn(q.getEndsOn())
                .completedAt(q.getCompletedAt())
                .isCompleted(q.getCompletedAt() != null)
                .build();
    }

    private static String formatUserName(User user) {
        if (user == null) {
            return null;
        }
        String first = user.getFirstName() != null ? user.getFirstName() : "";
        String last = user.getLastName() != null ? user.getLastName() : "";
        String full = (first + " " + last).trim();
        return full.isEmpty() ? user.getEmail() : full;
    }
}
