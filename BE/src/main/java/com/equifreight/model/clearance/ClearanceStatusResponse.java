package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DossierStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ClearanceStatusResponse(
        UUID jobId,
        String jobCode,
        DossierStatus dossierStatus,
        boolean clearanceReady,
        Instant clearanceReadyAt,
        int totalChecklistItems,
        int mandatoryItems,
        int clearedMandatoryItems,
        boolean allQuarantinesCompleted,
        int totalQuarantines,
        int completedQuarantines,
        List<String> outstandingIssues,
        // The pinned destination catalog ("Cambodia import") and its quarantine minimum; null before approval.
        String destination,
        Integer quarantineMinDays) {}
