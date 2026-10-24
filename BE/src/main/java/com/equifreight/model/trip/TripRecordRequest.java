package com.equifreight.model.trip;

import com.equifreight.entity.enums.TripRecordKind;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record TripRecordRequest(
        UUID routeStopId,
        @NotNull TripRecordKind kind,
        @NotNull Instant occurredAt,
        @NotNull UUID clientRef,
        @Size(max = 500) String text,
        @Size(max = 100) List<@Valid TripConditionRequest> conditions,
        // Who received the horses: required for HANDED_OVER, kept on the job's handover row.
        @Size(max = 120) String receiverName,
        // The receiver confirms on the tablet that they took the horses as recorded: required for HANDED_OVER.
        Boolean receiverConfirmed) {}
