package com.equifreight.model.note;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

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
