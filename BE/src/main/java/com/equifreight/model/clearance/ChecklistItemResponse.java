package com.equifreight.model.clearance;

import com.equifreight.entity.enums.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ChecklistItemResponse(
        UUID id,
        UUID jobId,
        String jobCode,
        // Document Type details
        UUID documentTypeId,
        String documentTypeCode,
        String documentTypeName,
        DocumentScope documentScope,
        DocumentProvider providedBy,
        // Rule details (if pinned)
        UUID regulationRuleId,
        RegulationRuleKind ruleKind,
        boolean mandatory,
        Short minDays,
        Short maxDays,
        String ruleDescription,
        // Scope targets
        UUID horseId,
        String horseName,
        String horseMicrochip,
        UUID borderCrossingId,
        String borderCrossingName,
        // Item state & evaluation
        ChecklistStatus status,
        Validity validity,
        String validityNote,
        Instant evaluatedAt,
        ChecklistHolder holder,
        LocalDate dueDate,
        // Latest version uploaded
        DocumentVersionResponse currentVersion,
        Instant createdAt,
        Instant updatedAt) {}
