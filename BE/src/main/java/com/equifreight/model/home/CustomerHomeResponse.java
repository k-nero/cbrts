package com.equifreight.model.home;

import java.time.Instant;
import java.util.List;
import lombok.Builder;

/**
 * The signed-in club's Home (DESIGN.md, Home signed in): what it owes across every request, each move with its
 * stage and what holds it, and its horses. {@code asOf} is the server's "now"; the page words every time against it.
 */
@Builder
public record CustomerHomeResponse(
        Instant asOf,
        String clubName,
        int requestCount,
        int horseCount,
        NextDepartureResponse nextDeparture,
        /* Soonest first; undated last. */
        List<OwedEntryResponse> owed,
        int owedRequestCount,
        /* Set only when nothing is owed and a move is in progress. */
        NextEventResponse nextEvent,
        /* What needs the club first, then by departure. */
        List<MoveEntryResponse> moves,
        List<HomeHorseResponse> horses,
        String horsesNote) {}
