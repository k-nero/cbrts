package com.equifreight.model.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** One submitted version of a request, as the customer sees it: no payload, the manager's note if returned. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionSummaryResponse {

    private short revisionNo;
    private Instant submittedAt;
    private String note;
    /** Null unless this version was returned for information. */
    private Instant returnedAt;
}
