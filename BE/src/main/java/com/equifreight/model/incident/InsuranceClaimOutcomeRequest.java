package com.equifreight.model.incident;

import com.equifreight.entity.enums.InsuranceClaimStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * The insurer's answer (US-F5-08): {@code SETTLED} with the amount paid, or {@code DECLINED} with the reason. The
 * service checks which one each outcome needs.
 */
public record InsuranceClaimOutcomeRequest(
        @NotNull InsuranceClaimStatus outcome,

        @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
        BigDecimal settledAmount,

        @Size(max = 300) String declineReason) {}
