package com.equifreight.model.clearance;

import com.equifreight.entity.enums.RegulationRuleKind;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

/** A draft rule's new values; the document type stays. The days follow the kind, as in {@link RegulationRuleRequest}. */
@Builder
public record RegulationRuleUpdateRequest(
        @NotNull RegulationRuleKind ruleKind, Short minDays, Short maxDays, Boolean mandatory, String description) {

    public RegulationRuleUpdateRequest {
        mandatory = mandatory == null ? Boolean.TRUE : mandatory;
    }
}
