package com.equifreight.model.request;

import java.time.LocalDate;
import lombok.Builder;

/** The lead-time check of a draft's departure date (BR-F1-01). */
@Builder
public record LeadTimeResponse(int requiredDays, LocalDate earliestDeparture, long daysBeforeDeparture, boolean met) {}
