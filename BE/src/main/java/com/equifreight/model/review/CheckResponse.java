package com.equifreight.model.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One feasibility check on the review page (spec §4.4): a state, its word and the evidence, in words. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckResponse {

    /** ROUTE_SERVED or LEAD_TIME. */
    private String key;
    /** OK or BAD. */
    private String state;

    private String word;
    private String evidence;
    private String sub;
}
