package com.equifreight.model.note;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CreateNoteReplyRequest {

    @NotBlank(message = "Reply body cannot be blank")
    private String body;

    /** Optional action: move associated checklist item due date */
    private LocalDate moveDueDateTo;

    /** Optional reason shown to customer for moving the due date */
    private String reasonForMove;
}
