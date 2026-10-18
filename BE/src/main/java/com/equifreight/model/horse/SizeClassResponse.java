package com.equifreight.model.horse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
