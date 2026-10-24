package com.equifreight.model.incident;

import com.equifreight.entity.enums.LeavingKind;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** An option considered for an incident, with its cost side by side (US-F5-02). */
public record IncidentOptionResponse(
        UUID id,
        short position,
        String title,
        String description,
        BigDecimal extraCost,
        int delayMinutes,
        boolean changesRoute,
        String createdByName,
        Instant createdAt,
        /** How horses leave the trip, or null (US-F5-06). */
        LeavingKind leavingKind,
        String leavingKindLabel,
        String leavingPlace,
        String vehicleCode,
        boolean customerPays,
        List<String> horseNames) {}
