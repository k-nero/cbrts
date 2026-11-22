package com.equifreight.model.invoice;

import com.equifreight.entity.enums.PaymentMethod;
import com.equifreight.entity.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

/**
 * A payment against an invoice (US-F6-03): recorded by hand, or paid by card online, which has no {@code recordedByName}
 * and the gateway's payment id as its reference.
 */
@Builder
public record PaymentResponse(
        UUID id,
        BigDecimal amount,
        PaymentMethod method,
        String reference,
        Instant receivedAt,
        String recordedByName,
        PaymentStatus status) {}
