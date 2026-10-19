package com.equifreight.model.note;

import com.equifreight.entity.enums.NoteStatus;
import com.equifreight.entity.enums.NoteTopic;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NoteResponse {
    private UUID id;
    private UUID clubId;
    private String clubName;
    private UUID requestId;
    private String requestCode;
    private UUID jobId;
    private String jobCode;
    private UUID checklistItemId;
    private String checklistItemName;
    private LocalDate checklistItemDueDate;
    private String checklistItemWarning;
    private NoteTopic topic;
    private String routedRole;
    private String subject;
    private String body;
    private UUID createdById;
    private String createdByName;
    private Instant createdAt;
    private Instant replyDueAt;
    private NoteStatus status;
    private boolean isDueToday;
    private boolean isOverdue;
    private String attachedFileName;
    private String attachedFileSize;
    private List<NoteReplyResponse> replies;
}
