package com.equifreight.model.clearance;

import com.equifreight.entity.enums.SubmissionStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAuthoritySubmissionRequest {

    @NotNull(message = "Status is required")
    private SubmissionStatus status;

    private String referenceNo;

    private LocalDate expectedBy;

    private UUID resultFileId;
}
