package com.equifreight.model.review;

import com.equifreight.model.quotation.QuotationRefResponse;
import com.equifreight.model.request.RequestResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

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
    /** The request's quotation once started (Start quotation or Open quotation); null before. */
    private QuotationRefResponse quotation;
}
