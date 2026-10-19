package com.equifreight.model.rate;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateLineResponse {
    private UUID id;
    private String code;
    private String groupCode;
    private String description;
    private RateBasis basis;
    private String basisDisplay;
    private HorseSex appliesToSex;
    private BigDecimal rate;
    private BigDecimal minCharge;
    private RateCertainty certainty;
}
