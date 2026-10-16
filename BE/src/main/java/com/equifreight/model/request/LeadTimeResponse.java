package com.equifreight.model.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** The lead-time check of a draft's departure date (BR-F1-01). */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeadTimeResponse {
    private int requiredDays;
    private LocalDate earliestDeparture;
    private long daysBeforeDeparture;
    private boolean met;
}
