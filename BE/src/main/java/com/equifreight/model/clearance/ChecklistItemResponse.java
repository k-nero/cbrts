package com.equifreight.model.clearance;

import com.equifreight.entity.enums.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistItemResponse {
    private UUID id;
    private UUID jobId;
    private String jobCode;

    // Document Type details
    private UUID documentTypeId;
    private String documentTypeCode;
    private String documentTypeName;
    private DocumentScope documentScope;
    private DocumentProvider providedBy;

    // Rule details (if pinned)
    private UUID regulationRuleId;
    private RegulationRuleKind ruleKind;
    private boolean mandatory;
    private Short minDays;
    private Short maxDays;
    private String ruleDescription;

    // Scope targets
    private UUID horseId;
    private String horseName;
    private String horseMicrochip;
    private UUID borderCrossingId;
    private String borderCrossingName;

    // Item state & evaluation
    private ChecklistStatus status;
    private Validity validity;
    private String validityNote;
    private Instant evaluatedAt;
    private ChecklistHolder holder;
    private LocalDate dueDate;

    // Latest version uploaded
    private DocumentVersionResponse currentVersion;

    private Instant createdAt;
    private Instant updatedAt;
}
