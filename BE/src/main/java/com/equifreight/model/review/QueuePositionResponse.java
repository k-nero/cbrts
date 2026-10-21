package com.equifreight.model.review;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Where a request sits in the review queue, oldest first: "3 of 4", and its neighbours. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueuePositionResponse {

    /** 1-based. */
    private int position;

    private int total;
    private UUID previousId;
    private UUID nextId;
}
