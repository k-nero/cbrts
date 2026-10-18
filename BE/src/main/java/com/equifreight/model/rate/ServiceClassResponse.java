package com.equifreight.model.rate;

import com.equifreight.entity.enums.ServiceClass;
import java.math.BigDecimal;
import lombok.Builder;

/** An air stall class on one corridor; perHorse is the position rate shared by its horses. */
@Builder
public record ServiceClassResponse(
        ServiceClass serviceClass,
        short widthPerHorseIn,
        short horsesPerPosition,
        BigDecimal positionRate,
        BigDecimal perHorse) {}
