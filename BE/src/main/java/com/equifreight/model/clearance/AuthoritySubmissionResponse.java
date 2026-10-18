package com.equifreight.model.clearance;

import com.equifreight.entity.enums.SubmissionKind;
import com.equifreight.entity.enums.SubmissionStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthoritySubmissionResponse {
    private UUID id;
    private UUID jobId;
    private String jobCode;
    private AuthorityResponse authority;
    private SubmissionKind kind;
    private SubmissionStatus status;
    private Instant filedAt;
    private String filedByName;
    private String referenceNo;
    private LocalDate expectedBy;
    private boolean isOverdue;
    private Instant issuedAt;
    private UUID resultFileId;
    private String resultFileName;
    private List<UUID> checklistItemIds;
}
