package com.equifreight.model.rate;

import com.equifreight.entity.enums.RatePolicyKey;
import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatePolicyItemResponse {
    private RatePolicyKey key;
    private String label;
    private String valueDisplay;
    private BigDecimal rawValue;
}
