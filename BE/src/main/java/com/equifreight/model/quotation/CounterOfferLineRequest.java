package com.equifreight.model.quotation;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * One line of a counter-offer.
 *
 * @param lineKey the quotation line's key, as the customer's quotation returns it
 * @param askedAmount what the club would pay: at least 0 and below the line's amount
 * @param reason why, for the logistics manager
 */
public record CounterOfferLineRequest(
        @NotBlank String lineKey,

        @NotNull @PositiveOrZero @Digits(integer = 12, fraction = 2)
        BigDecimal askedAmount,

        @NotBlank @Size(max = 300) String reason) {}
