package com.equifreight.model.home;

import java.time.Instant;
import lombok.Builder;

/**
 * When nothing is owed, the next event leads instead (DESIGN.md, Home states). {@code at} is null when no move has
 * a date yet; {@code dateStyle} is {@code date}, {@code dayTime} or {@code time}.
 */
@Builder
public record NextEventResponse(String title, String body, String verb, Instant at, String dateStyle) {}
