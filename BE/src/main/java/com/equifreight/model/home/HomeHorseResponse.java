package com.equifreight.model.home;

import java.util.UUID;
import lombok.Builder;

/** A horse on Home: its coat, breed line, documents for the next move and the one thing it waits on. */
@Builder
public record HomeHorseResponse(
        UUID id,
        String name,
        /* {@code grey}, {@code black}, {@code chestnut}, {@code bay} or {@code other}. */
        String coat,
        /* "Grey · Andalusian gelding". */
        String line,
        /* "4 of 5 cleared", or "No move booked". */
        String documents,
        TonedTextResponse note) {}
