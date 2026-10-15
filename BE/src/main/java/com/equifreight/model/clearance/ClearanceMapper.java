package com.equifreight.model.clearance;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.DocumentVersion;
import com.equifreight.entity.User;

import java.util.UUID;

public final class ClearanceMapper {

    private ClearanceMapper() {}

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
                .checklistItemId(version.getChecklistItem() != null ? version.getChecklistItem().getId() : null)
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
