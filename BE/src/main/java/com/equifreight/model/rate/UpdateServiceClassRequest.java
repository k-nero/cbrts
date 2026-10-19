package com.equifreight.model.rate;

import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateServiceClassRequest {
    private BigDecimal positionRate;
}
