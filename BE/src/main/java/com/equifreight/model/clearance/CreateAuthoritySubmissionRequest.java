package com.equifreight.model.clearance;

import com.equifreight.entity.enums.SubmissionKind;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record CreateAuthoritySubmissionRequest(
        @NotNull(message = "Authority ID is required") UUID authorityId,
        @NotNull(message = "Submission kind is required") SubmissionKind kind,
        String referenceNo,
        LocalDate expectedBy,
        List<UUID> checklistItemIds) {}
