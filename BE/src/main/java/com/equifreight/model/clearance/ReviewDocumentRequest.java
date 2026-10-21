package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DocumentReview;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
public record ReviewDocumentRequest(
        @NotNull(message = "Review decision is required") DocumentReview review,
        /**
         * Required when review == REJECTED (BR-F2-07).
         */
        @Size(max = 500, message = "A reject reason is at most 500 characters.")
        String rejectReason) {}
