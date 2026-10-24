package com.equifreight.model.invoice;

import com.equifreight.entity.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Builder;

/** A payment received, recorded by hand (US-F6-03): no payment gateway. */
@Builder
public record RecordPaymentRequest(
        @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2)
        BigDecimal amount,

        @NotNull PaymentMethod method,
        @Size(max = 100) String reference,
        @NotNull LocalDate receivedOn) {}
