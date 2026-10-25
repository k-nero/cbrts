package com.equifreight.model.clearance;

import com.equifreight.entity.enums.RegulationRuleKind;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Builder;

/**
 * A document rule to add to a draft version. The days a rule takes depend on its kind: a window before departure
 * and "valid until arrival plus" take {@code maxDays}, a booster window takes both, presence only takes none.
 */
@Builder
public record RegulationRuleRequest(
        @NotNull UUID documentTypeId,
        @NotNull RegulationRuleKind ruleKind,
        Short minDays,
        Short maxDays,
        Boolean mandatory,
        String description) {

    public RegulationRuleRequest {
        mandatory = mandatory == null ? Boolean.TRUE : mandatory;
    }
}
