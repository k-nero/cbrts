package com.equifreight.model.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** One line of a request's history, from the audit log (BR-F1-08). */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoryEntryResponse {

    private Instant occurredAt;
    private String summary;
    private String actorLabel;
}
