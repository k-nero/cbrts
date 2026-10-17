package com.equifreight.model.review;

import com.equifreight.entity.enums.TransportMode;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One row of the logistics manager's review queue (US-F1-03). */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueRowResponse {

    private UUID id;
    private String code;
    private String club;
    private String fromCity;
    private String toCity;
    private TransportMode mode;
    private long horseCount;
    private LocalDate departureDate;
    private int dateFlexDays;
    /** When the request entered the queue: its latest version's submission. */
    private Instant waitingSince;
    /** The latest version; 2 or more means it came back after a return for information. */
    private short revisionNo;
}
