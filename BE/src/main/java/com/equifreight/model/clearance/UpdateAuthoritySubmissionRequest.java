package com.equifreight.model.clearance;

import com.equifreight.entity.enums.SubmissionStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record UpdateAuthoritySubmissionRequest(
        @NotNull(message = "Status is required") SubmissionStatus status,
        String referenceNo,
        LocalDate expectedBy,
        UUID resultFileId) {}
