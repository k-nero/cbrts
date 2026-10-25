package com.equifreight.model.clearance;

import com.equifreight.entity.enums.RegulationRuleKind;
import java.util.UUID;
import lombok.Builder;

/**
 * One document rule of a regulation version. {@code diffStatus} compares a draft's rule with the published version:
 * {@code UNCHANGED}, {@code CHANGED} or {@code NEW}.
 */
@Builder
public record RegulationRuleResponse(
        UUID id,
        DocumentTypeResponse documentType,
        boolean mandatory,
        RegulationRuleKind ruleKind,
        Short minDays,
        Short maxDays,
        String description,
        String diffStatus,
        String parameterDisplay) {}
