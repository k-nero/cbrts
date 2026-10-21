package com.equifreight.model.note;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NoteReplyResponse {
    private UUID id;
    private UUID authorId;
    private String authorName;
    private String authorRole;
    private String body;
    private Instant createdAt;
}
