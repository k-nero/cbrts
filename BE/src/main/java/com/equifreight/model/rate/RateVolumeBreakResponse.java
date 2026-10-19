package com.equifreight.model.rate;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateVolumeBreakResponse {
    private UUID id;
    private short minHorses;
    private Short maxHorses;
    private BigDecimal discountPct;
    private String label;
    private boolean highlighted;
    private String previousValue;
}
