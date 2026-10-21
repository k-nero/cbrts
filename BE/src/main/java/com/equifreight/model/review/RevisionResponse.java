package com.equifreight.model.review;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tools.jackson.databind.JsonNode;

/** One submitted version as the manager sees it: what the customer sent, as stored, and the note it came back with. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionResponse {

    private short revisionNo;
    private Instant submittedAt;
    private String note;
    private Instant returnedAt;
    /** The request as submitted, passed through as stored, so a version written before a change still reads. */
    private JsonNode payload;
}
