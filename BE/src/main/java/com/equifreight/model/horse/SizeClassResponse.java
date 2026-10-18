package com.equifreight.model.horse;

import lombok.*;

import java.math.BigDecimal;

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
