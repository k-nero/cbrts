package com.equifreight.model.quotation;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** A line's new amount and why (US-Q-02): the reason is mandatory, and the total is still computed. */
public record OverrideRequest(
        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2)
        BigDecimal amount,

        @NotBlank @Size(max = 300) String reason) {}
