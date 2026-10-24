package com.equifreight.model.incident;

import com.equifreight.entity.enums.IncidentKind;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import lombok.Builder;

/**
 * A delay alert (US-F5-04): why the trip is late ({@code TRAFFIC}, {@code WEATHER} or {@code BORDER_CONGESTION}), the
 * job's new arrival, and an optional note that its own customer and the crew read as written.
 */
@Builder
public record DelayAlertRequest(
        @NotNull IncidentKind reason,
        @NotNull OffsetDateTime newEta,
        @Size(max = 500) String note) {}
