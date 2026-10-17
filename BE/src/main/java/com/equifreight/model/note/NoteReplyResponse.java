package com.equifreight.model.note;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

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
