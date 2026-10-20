package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DocumentReview;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record ReviewDocumentRequest(
        @NotNull(message = "Review decision is required") DocumentReview review,
        /**
         * Required when review == REJECTED (BR-F2-07).
         */
        String rejectReason) {}
