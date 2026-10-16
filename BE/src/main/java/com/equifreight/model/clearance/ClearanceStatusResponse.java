package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DossierStatus;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClearanceStatusResponse {
    private UUID jobId;
    private String jobCode;
    private DossierStatus dossierStatus;
    private boolean clearanceReady;
    private Instant clearanceReadyAt;

    private int totalChecklistItems;
    private int mandatoryItems;
    private int clearedMandatoryItems;

    private boolean allQuarantinesCompleted;
    private int totalQuarantines;
    private int completedQuarantines;

    private List<String> outstandingIssues;
}
