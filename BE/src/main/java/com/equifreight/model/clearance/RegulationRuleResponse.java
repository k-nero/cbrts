package com.equifreight.model.clearance;

import com.equifreight.entity.enums.RegulationRuleKind;
import java.util.UUID;
import lombok.Builder;

@Builder
public record RegulationRuleResponse(
        UUID id,
        DocumentTypeResponse documentType,
        boolean mandatory,
        RegulationRuleKind ruleKind,
        Short minDays,
        Short maxDays,
        String description) {}
