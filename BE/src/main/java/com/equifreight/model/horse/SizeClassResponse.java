package com.equifreight.model.horse;

import java.math.BigDecimal;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SizeClassResponse {
    private String code;
    private short widthIn;
    private BigDecimal minHeightHh;
}
