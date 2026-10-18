package com.equifreight.model.clearance;

import com.equifreight.entity.enums.SubmissionKind;
import com.equifreight.entity.enums.SubmissionStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record AuthoritySubmissionResponse(
        UUID id,
        UUID jobId,
        String jobCode,
        AuthorityResponse authority,
        SubmissionKind kind,
        SubmissionStatus status,
        Instant filedAt,
        String filedByName,
        String referenceNo,
        LocalDate expectedBy,
        boolean isOverdue,
        Instant issuedAt,
        UUID resultFileId,
        String resultFileName,
        List<UUID> checklistItemIds) {}
