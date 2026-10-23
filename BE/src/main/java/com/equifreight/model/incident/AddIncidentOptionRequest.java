package com.equifreight.model.incident;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * An option for handling an incident (US-F5-02): what it is, its estimated extra cost in the job's quotation currency,
 * the minutes it adds to the arrival, and whether it takes the horses another way.
 */
public record AddIncidentOptionRequest(
        @NotBlank @Size(max = 160) String title,
        @Size(max = 1000) String description,

        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2)
        BigDecimal extraCost,

        @Min(0) @Max(7 * 24 * 60) int delayMinutes,
        boolean changesRoute) {}
