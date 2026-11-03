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
        /** The catalog the rule comes from: "Hong Kong v2", the origin's or the destination's pinned version. */
        String ruleCatalog,
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
        /** The job moved onto a catalog version that no longer lists this document; it no longer counts. */
        Instant droppedAt,
        /** The item came from a catalog version the job moved onto later ("Added in Hong Kong v5"). */
        boolean addedByUpdate,
        // Latest version uploaded
        DocumentVersionResponse currentVersion,
        Instant createdAt,
        Instant updatedAt) {}
