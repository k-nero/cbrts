package com.equifreight.model.home;

import com.equifreight.entity.enums.RequestStatus;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

/** One request in progress, as a pass: its route, where it stands and what holds it. */
@Builder
public record MoveEntryResponse(
        UUID requestId,
        String requestCode,
        RequestStatus status,
        /* "Ho Chi Minh City → Phnom Penh". */
        String route,
        /* "job CBRT-2026-041 · 4 horses · road, private trailer". */
        String detail,
        /* One of the seven stage names. */
        String stage,
        TonedTextResponse holds,
        /* Null for a draft without a departure date. */
        Instant departsAt,
        /* Set while the move is on the road. */
        Instant arrivesAt) {}
