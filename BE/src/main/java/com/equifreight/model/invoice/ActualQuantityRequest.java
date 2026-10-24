package com.equifreight.model.invoice;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Builder;

/** An estimated line's actual quantity on a draft final invoice, and why it changed (US-F6-03). */
@Builder
public record ActualQuantityRequest(
        @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2)
        BigDecimal quantity,

        @Size(max = 300) String note) {}
