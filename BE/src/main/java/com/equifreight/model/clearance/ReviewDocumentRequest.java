package com.equifreight.model.clearance;

import com.equifreight.entity.enums.DocumentReview;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewDocumentRequest {

    @NotNull(message = "Review decision is required")
    private DocumentReview review;

    /**
     * Required when review == REJECTED (BR-F2-07).
     */
    private String rejectReason;
}
