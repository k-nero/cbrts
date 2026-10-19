package com.equifreight.model.clearance;

import com.equifreight.entity.enums.RegulationRuleKind;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegulationRuleUpdateRequest {
    private RegulationRuleKind ruleKind;
    private Short minDays;
    private Short maxDays;
    private Boolean mandatory;
    private String description;
}
