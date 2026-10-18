package com.equifreight.model.clearance;

import com.equifreight.entity.enums.SubmissionKind;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAuthoritySubmissionRequest {

    @NotNull(message = "Authority ID is required")
    private UUID authorityId;

    @NotNull(message = "Submission kind is required")
    private SubmissionKind kind;

    private String referenceNo;

    private LocalDate expectedBy;

    private List<UUID> checklistItemIds;
}
