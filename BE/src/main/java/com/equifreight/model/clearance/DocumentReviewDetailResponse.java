package com.equifreight.model.clearance;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * Details for the Transport Specialist's Document Review page (US-F2-04, issue #88).
 * Contains the document version to review, its checklist item details, job context,
 * automatic check results, version history, and queue navigation. {@code queuePosition} is 1-based, and 0 when the
 * version is no longer waiting for review.
 */
@Builder
public record DocumentReviewDetailResponse(
        DocumentVersionResponse version,
        ChecklistItemResponse item,
        UUID jobId,
        String jobCode,
        String requestCode,
        String clubName,
        LocalDate departureDate,
        int totalChecklistItems,
        int mandatoryItems,
        int clearedMandatoryItems,
        int remainingMandatoryItems,
        List<DocumentVersionResponse> allVersions,
        String automaticCheckText,
        String automaticCheckTone,
        int queuePosition,
        int queueTotal,
        UUID nextVersionId,
        String nextDocumentName) {}
