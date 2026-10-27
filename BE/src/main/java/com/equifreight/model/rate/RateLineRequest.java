package com.equifreight.model.rate;

import com.equifreight.entity.enums.HorseSex;
import com.equifreight.entity.enums.RateBasis;
import com.equifreight.entity.enums.RateCertainty;
import com.equifreight.entity.enums.TrailerType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Builder;

/** A catalog line to add or change in the draft (spec §5.3); corridorId null means every corridor. */
@Builder(toBuilder = true)
public record RateLineRequest(
        UUID corridorId,

        @NotBlank @Size(max = 40) @Pattern(regexp = "[A-Z0-9_]+", message = "Use capitals, digits and underscores.")
        String code,

        @NotBlank @Pattern(regexp = "[A-H]", message = "The group is a letter from A to H.")
        String group,

        @NotBlank @Size(max = 160) String description,
        @NotNull RateBasis basis,
        HorseSex appliesToSex,
        TrailerType appliesToTrailer,

        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2, message = TWO_DECIMALS)
        BigDecimal rate,

        @DecimalMin("0") @Digits(integer = 12, fraction = 2, message = TWO_DECIMALS)
        BigDecimal minCharge,

        @DecimalMin(value = "0", inclusive = false) @Digits(integer = 8, fraction = 2, message = TWO_DECIMALS)
        BigDecimal defaultQuantity,

        RateCertainty certainty,
        @Size(max = 300) String estimateNote,
        /** Not charged at an end a domestic road leg covers (US-F3-21); group A or G only. False when left out. */
        Boolean coveredByRoadLeg) {

    /** rate_lines keeps money and quantities as numeric(…, 2). */
    public static final String TWO_DECIMALS = "Use at most 2 decimals.";

    public RateLineRequest {
        certainty = certainty == null ? RateCertainty.FIXED : certainty;
        coveredByRoadLeg = coveredByRoadLeg != null && coveredByRoadLeg;
    }
}
