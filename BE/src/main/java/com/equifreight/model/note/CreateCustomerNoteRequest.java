package com.equifreight.model.note;

import com.equifreight.entity.enums.NoteTopic;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * A customer's note on one of their requests (US-00-08). The topic decides who answers; the item and the file are
 * optional.
 */
public record CreateCustomerNoteRequest(
        @NotNull(message = "Choose what the note is about") NoteTopic topic,
        /** A document on the request's checklist that the note is about. */
        UUID checklistItemId,
        @NotBlank(message = "Write your note")
                @Size(max = 2000, message = "Keep the note under 2,000 characters")
                String body,
        /** A file uploaded first through the file API, such as an insurer's email. */
        UUID attachedFileId) {}
