package com.equifreight.model.rate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Builder;

/** An air stall class's width per horse and position rate; the horses per position follow from the width. */
@Builder
public record ServiceClassRequest(
        @NotNull Short widthPerHorseIn,

        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2, message = RateLineRequest.TWO_DECIMALS)
        BigDecimal positionRate) {}
