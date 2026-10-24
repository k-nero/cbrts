package com.equifreight.model.invoice;

import com.equifreight.entity.enums.HandoverOutcome;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

/** A job whose handover is settled and that has no final invoice yet (US-F6-03). */
@Builder
public record ReadyForInvoiceResponse(
        UUID jobId,
        String jobCode,
        String clubName,
        HandoverOutcome outcome,
        boolean acceptedByDefault,
        Instant answeredAt) {}
