package com.equifreight.model.clearance;

import com.equifreight.entity.ChecklistItem;
import com.equifreight.entity.Corridor;
import com.equifreight.entity.Country;
import com.equifreight.entity.DocumentVersion;
import com.equifreight.entity.Place;
import com.equifreight.entity.RegulationCatalog;
import com.equifreight.entity.RegulationRule;
import com.equifreight.entity.RegulationVersion;
import com.equifreight.entity.TransportJob;
import com.equifreight.entity.TransportRequest;
import com.equifreight.entity.User;
import com.equifreight.entity.enums.CatalogStatus;
import com.equifreight.entity.enums.DocumentScope;
import com.equifreight.entity.enums.DossierStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

public final class ClearanceMapper {

    private ClearanceMapper() {}

    /** A job on the transport specialist's picker. */
    public static JobSummaryResponse toJobSummaryResponse(TransportJob job) {
        TransportRequest request = job.getRequest();
        Corridor corridor = request.getCorridor();
        return JobSummaryResponse.builder()
                .id(job.getId())
                .code(job.getCode())
                .dossierStatus(job.getDossierStatus())
                .stage(job.getStage())
                .clubName(request.getClub().getName())
                .originCity(cityOf(request.getOriginPlace(), corridor == null ? null : corridor.getOriginCity()))
                .destinationCity(
                        cityOf(request.getDestinationPlace(), corridor == null ? null : corridor.getDestinationCity()))
                .build();
    }

    /** The place's city, else the corridor's (a request typed as free text has no place). */
    private static String cityOf(Place place, String corridorCity) {
        return place != null ? place.getCity() : corridorCity;
    }

    /** The clearance gate of a job, with the counts ClearanceService worked out. */
    public static ClearanceStatusResponse toStatusResponse(
            TransportJob job,
            RegulationVersion destination,
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
                .departedAt(job.getDepartedAt())
                .isDeparted(job.getDepartedAt() != null)
                .totalChecklistItems(totalChecklistItems)
                .mandatoryItems(mandatoryItems)
                .clearedMandatoryItems(clearedMandatoryItems)
                .totalQuarantines(totalQuarantines)
                .completedQuarantines(completedQuarantines)
                .allQuarantinesCompleted(completedQuarantines == totalQuarantines)
                .outstandingIssues(outstandingIssues)
                .destination(
                        destination == null ? null : destination.getCatalog().getName())
                .quarantineMinDays(destination == null ? null : (int) destination.getQuarantineMinDays())
                .build();
    }

    /**
     * A country's regulation catalog from its versions, newest first. {@code pinnedJobs} counts the jobs pinned to
     * each version id; a version with none may be absent.
     */
    public static RegulationCatalogResponse toCatalogResponse(
            RegulationCatalog catalog,
            String countryCode,
            List<RegulationVersion> versions,
            Map<UUID, Long> pinnedJobs) {
        Function<RegulationVersion, RegulationVersionResponse> summary =
                v -> toVersionResponse(v, pinnedJobs.getOrDefault(v.getId(), 0L).intValue(), List.of(), 0);
        RegulationVersion active = versions.stream()
                .filter(v -> v.getStatus() == CatalogStatus.PUBLISHED)
                .findFirst()
                .orElse(null);
        RegulationVersion draft = versions.stream()
                .filter(v -> v.getStatus() == CatalogStatus.DRAFT)
                .findFirst()
                .orElse(null);
        return RegulationCatalogResponse.builder()
                .id(catalog.getId())
                .countryCode(countryCode)
                .name(catalog.getName())
                .activeVersion(active == null ? null : summary.apply(active))
                .draftVersion(draft == null ? null : summary.apply(draft))
                .versions(versions.stream().map(summary).toList())
                .build();
    }

    /** A country on the regulation catalog page, with its catalog or null when it has none yet. */
    public static RegulationCountryResponse toCountryResponse(Country country, RegulationCatalogResponse catalog) {
        return RegulationCountryResponse.builder()
                .id(country.getId())
                .code(country.getCode())
                .name(country.getName())
                .catalog(catalog)
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
        String reviewedByCalledName = null;
        if (version.getReviewedBy() != null) {
            reviewedById = version.getReviewedBy().getId();
            reviewedByName = formatUserName(version.getReviewedBy());
            reviewedByCalledName = calledName(version.getReviewedBy());
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
                .reviewedByCalledName(reviewedByCalledName)
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
                .category(dt.getCategory())
                .build();
    }

    /** "within 45 d", "arrival + 2 d", "7–180 d before", "1 per crossing" or "—": a rule's parameter in words. */
    public static String parameterText(RegulationRule rule) {
        if (rule.getRuleKind() == null) return "—";
        return switch (rule.getRuleKind()) {
            case VALID_THROUGH_ARRIVAL_PLUS ->
                rule.getMaxDays() != null ? "arrival + " + rule.getMaxDays() + " d" : "arrival";
            case BOOSTER_WINDOW ->
                (rule.getMinDays() != null ? rule.getMinDays() : 0) + "–"
                        + (rule.getMaxDays() != null ? rule.getMaxDays() : 0) + " d before";
            case WINDOW_BEFORE_DEPARTURE ->
                rule.getMaxDays() != null ? "within " + rule.getMaxDays() + " d" : "before departure";
            case PRESENCE_ONLY ->
                rule.getDocumentType() != null && rule.getDocumentType().getScope() == DocumentScope.PER_CROSSING
                        ? "1 per crossing"
                        : "—";
        };
    }

    /**
     * A version's rule. {@code diffStatus} and {@code parameterDisplay} come from the service's comparison with the
     * published version ("within 45 d (was 60 d)").
     */
    public static RegulationRuleResponse toRuleResponse(
            RegulationRule rule, String diffStatus, String parameterDisplay) {
        return RegulationRuleResponse.builder()
                .id(rule.getId())
                .documentType(toDocumentTypeResponse(rule.getDocumentType()))
                .mandatory(rule.isMandatory())
                .ruleKind(rule.getRuleKind())
                .minDays(rule.getMinDays())
                .maxDays(rule.getMaxDays())
                .description(rule.getDescription())
                .diffStatus(diffStatus)
                .parameterDisplay(parameterDisplay)
                .build();
    }

    /** A regulation version with the counts and rules the service worked out (empty rules for a list row). */
    public static RegulationVersionResponse toVersionResponse(
            RegulationVersion rv, int pinnedJobsCount, List<RegulationRuleResponse> rules, int changesCount) {
        return RegulationVersionResponse.builder()
                .id(rv.getId())
                .catalogId(rv.getCatalog() != null ? rv.getCatalog().getId() : null)
                .versionNo(rv.getVersionNo())
                .status(rv.getStatus())
                .publishedAt(rv.getPublishedAt())
                .publishedByName(rv.getPublishedBy() != null ? formatUserName(rv.getPublishedBy()) : null)
                .leadTimeDays(rv.getLeadTimeDays())
                .domesticLeadTimeDays(rv.getDomesticLeadTimeDays())
                .quarantineMinDays(rv.getQuarantineMinDays())
                .arrivalBufferDays(rv.getArrivalBufferDays())
                .rules(rules)
                .pinnedJobsCount(pinnedJobsCount)
                .changesCount(changesCount)
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

    public static DocumentReviewDetailResponse toReviewDetailResponse(
            DocumentVersion version,
            ChecklistItem item,
            TransportJob job,
            List<DocumentVersion> allVersions,
            String autoCheckText,
            String autoCheckTone,
            int totalItems,
            int clearedMandatory,
            int mandatoryItems,
            int queuePosition,
            int queueTotal,
            UUID nextVersionId,
            String nextDocName) {
        TransportRequest request = job != null ? job.getRequest() : null;
        return DocumentReviewDetailResponse.builder()
                .version(toVersionResponse(version))
                .item(toItemResponse(item))
                .jobId(job != null ? job.getId() : null)
                .jobCode(job != null ? job.getCode() : null)
                .requestCode(request != null ? request.getCode() : null)
                .clubName(
                        request != null && request.getClub() != null
                                ? request.getClub().getName()
                                : null)
                .departureDate(request != null ? request.getDepartureDate() : null)
                .totalChecklistItems(totalItems)
                .clearedMandatoryItems(clearedMandatory)
                .mandatoryItems(mandatoryItems)
                .remainingMandatoryItems(Math.max(0, mandatoryItems - clearedMandatory))
                .allVersions(
                        allVersions == null
                                ? List.of()
                                : allVersions.stream()
                                        .map(ClearanceMapper::toVersionResponse)
                                        .toList())
                .automaticCheckText(autoCheckText)
                .automaticCheckTone(autoCheckTone)
                .queuePosition(queuePosition)
                .queueTotal(queueTotal)
                .nextVersionId(nextVersionId)
                .nextDocumentName(nextDocName)
                .build();
    }

    /** The last word of the given name, which is what a Vietnamese name is called by: "Thị Lan" → "Lan". */
    static String calledName(User user) {
        String first = user.getFirstName() == null ? "" : user.getFirstName().strip();
        return first.isEmpty() ? null : first.substring(first.lastIndexOf(' ') + 1);
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
