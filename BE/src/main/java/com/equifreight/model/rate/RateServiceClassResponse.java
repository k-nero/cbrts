package com.equifreight.model.rate;

import com.equifreight.entity.enums.ServiceClass;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateServiceClassResponse {
    private UUID id;
    private ServiceClass serviceClass;
    private String serviceClassName;
    private short widthPerHorseIn;
    private short horsesPerPosition;
    private BigDecimal positionRate;
    private BigDecimal perHorseRate;
}
