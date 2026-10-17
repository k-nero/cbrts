package com.equifreight.model.review;

import com.equifreight.model.request.RequestResponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/** The Request review page (spec §4.3): the request, its two checks, every version, its history and its place in the queue. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestReviewResponse {

    private RequestResponse request;
    private List<CheckResponse> checks;
    private List<RevisionResponse> revisions;
    private List<HistoryEntryResponse> history;
    /** Null when the request isn't waiting for review. */
    private QueuePositionResponse queue;
}
