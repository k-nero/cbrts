package com.equifreight.controller.staff;

import com.equifreight.entity.User;
import com.equifreight.model.note.CreateNoteReplyRequest;
import com.equifreight.model.note.NoteResponse;
import com.equifreight.service.NoteService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/staff/customer-notes")
public class CustomerNoteController {

    private final NoteService noteService;

    public CustomerNoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    /** Customer notes routed to the signed-in role; the logistics manager reads every note (US-00-08). */
    @GetMapping
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public List<NoteResponse> listNotes(@AuthenticationPrincipal User user) {
        return noteService.listNotesForStaff(user);
    }

    /** Retrieve detailed note with replies. */
    @GetMapping("/{noteId}")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public NoteResponse getNote(@PathVariable UUID noteId, @AuthenticationPrincipal User user) {
        return noteService.getNote(noteId, user);
    }

    /** Reply to a customer note. */
    @PostMapping("/{noteId}/replies")
    @PreAuthorize("hasAnyRole('TRANSPORT_SPECIALIST', 'LOGISTICS_MANAGER', 'FLEET_COORDINATOR')")
    public NoteResponse replyToNote(
            @PathVariable UUID noteId,
            @Valid @RequestBody CreateNoteReplyRequest request,
            @AuthenticationPrincipal User user) {
        return noteService.replyToNote(noteId, request, user);
    }
}
