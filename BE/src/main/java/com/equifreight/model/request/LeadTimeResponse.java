package com.equifreight.model.request;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

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
