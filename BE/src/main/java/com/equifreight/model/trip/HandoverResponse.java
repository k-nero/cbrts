package com.equifreight.model.trip;

import com.equifreight.entity.enums.HandoverOutcome;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

/**
 * A job's handover at the destination (US-F6-01): delivered, then handed over to a named receiver who confirmed it,
 * with the HANDED_OVER record holding each horse's condition; then the customer's answer by {@code confirmDueAt}.
 */
@Builder
public record HandoverResponse(
        Instant deliveredAt,
        Instant handedOverAt,
        String receiverName,
        boolean receiverConfirmed,
        /** The HANDED_OVER trip record in the view's records. */
        UUID recordId,
        Instant confirmDueAt,
        HandoverOutcome customerOutcome,
        Instant confirmedAt,
        String confirmedByName,
        /** Minutes after the window closed; null without a window or before it's worked out. */
        Integer lateMinutes) {}
