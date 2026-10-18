package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DocumentReview;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record DocumentVersionResponse(
        UUID id,
        UUID checklistItemId,
        short versionNo,
        // File info
        UUID fileId,
        String fileName,
        String contentType,
        long sizeBytes,
        // Document validity fields
        LocalDate issuedOn,
        LocalDate sampledOn,
        LocalDate validUntil,
        String issuer,
        // Uploader info
        UUID uploadedById,
        String uploadedByName,
        Instant uploadedAt,
        // Review info
        DocumentReview review,
        UUID reviewedById,
        String reviewedByName,
        Instant reviewedAt,
        String rejectReason) {}
