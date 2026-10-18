package com.equifreight.model.clearance;

import com.equifreight.entity.enums.RegulationRuleKind;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegulationRuleResponse {
    private UUID id;
    private DocumentTypeResponse documentType;
    private boolean mandatory;
    private RegulationRuleKind ruleKind;
    private Short minDays;
    private Short maxDays;
    private String description;
}
