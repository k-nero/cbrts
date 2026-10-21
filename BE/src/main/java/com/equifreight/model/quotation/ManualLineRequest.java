package com.equifreight.model.quotation;

import com.equifreight.entity.enums.RateCertainty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * A line the logistics manager adds to the draft (US-F1-05): its amount is quantity × unit rate, and the reason says
 * what the catalog doesn't know. An estimated line also says why it may vary.
 */
public record ManualLineRequest(
        @NotNull @Pattern(regexp = "[A-H]") String group,
        @NotBlank @Size(max = 160) String description,

        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 8, fraction = 2)
        BigDecimal quantity,

        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2)
        BigDecimal unitRate,

        @NotNull RateCertainty certainty,
        @Size(max = 300) String estimateNote,
        @NotBlank @Size(max = 300) String reason) {}
