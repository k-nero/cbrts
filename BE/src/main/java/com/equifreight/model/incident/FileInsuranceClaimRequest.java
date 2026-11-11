package com.equifreight.model.incident;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** Files the insurance claim on an incident (US-F5-08): with whom, their reference, and the amount claimed. */
public record FileInsuranceClaimRequest(
        @NotBlank @Size(max = 120) String insurer,
        @NotBlank @Size(max = 60) String reference,

        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
        BigDecimal claimedAmount,

        @Size(max = 500) String note) {}
